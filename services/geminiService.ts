import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Balance, Reminder } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const reminderSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      personId: { type: Type.STRING },
      message: { type: Type.STRING, description: "A context-aware message urging the person to add money." },
    },
    required: ["personId", "message"],
  },
};

export const generateReminders = async (
  balances: Balance[], 
  tone: string = "friendly",
  mealRate: number,
  threshold: number = 50
): Promise<Partial<Reminder>[]> => {
  // Target users below the custom threshold
  const targetUsers = balances.filter(b => b.balance < threshold);
  
  if (targetUsers.length === 0) return [];

  // Prepare detailed context for the AI
  const userContexts = targetUsers.map(u => {
    const mealsLeft = mealRate > 0 ? (u.balance / mealRate).toFixed(1) : 'Unknown';
    const isNegative = u.balance < 0;
    
    return {
      id: u.personId,
      name: u.name,
      balance: u.balance.toFixed(2),
      status: isNegative ? 'DEBT' : 'LOW_FUNDS',
      mealsRemaining: isNegative ? 0 : mealsLeft
    };
  });

  const prompt = `
    You are an automated finance manager for a shared meal plan.
    Current Meal Rate: $${mealRate.toFixed(2)} / meal.

    Task: Generate short, effective notification messages for the following members who have low or negative balances.

    Analysis Data:
    ${JSON.stringify(userContexts)}

    Guidelines:
    1. If Status is DEBT: Be firm. Mention they owe $${Math.abs(Number(userContexts[0].balance)).toFixed(2)}.
    2. If Status is LOW_FUNDS: Be helpful. Mention they only have enough for approx ${userContexts[0].mealsRemaining} more meals.
    3. Tone: ${tone}.
    4. Keep messages under 20 words if possible.

    Output JSON format: [{ "personId": "...", "message": "..." }]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: reminderSchema,
      }
    });

    const rawText = response.text;
    if (!rawText) return [];

    const parsedData = JSON.parse(rawText) as { personId: string; message: string }[];
    
    return parsedData.map(item => {
      const user = targetUsers.find(d => d.personId === item.personId);
      return {
        personId: item.personId,
        name: user?.name || "Unknown",
        amountOwed: user && user.balance < 0 ? Math.abs(user.balance) : 0,
        message: item.message,
        generatedAt: Date.now()
      };
    });

  } catch (error) {
    console.error("Error generating reminders:", error);
    // Fallback logic
    return targetUsers.map(d => ({
      personId: d.personId,
      name: d.name,
      amountOwed: d.balance < 0 ? Math.abs(d.balance) : 0,
      message: d.balance < 0 
        ? `Alert: Balance is ${d.balance.toFixed(2)}. Please add money.` 
        : `Warning: Balance low (${d.balance.toFixed(2)}). Recharge soon.`,
      generatedAt: Date.now()
    }));
  }
};