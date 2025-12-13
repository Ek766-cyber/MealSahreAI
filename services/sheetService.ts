import { Person } from '../types';

interface SheetResult {
  people: Person[];
  hasContribution: boolean;
  extractedRate?: number;
}

/**
 * Fetches data from a Google Sheet published as CSV.
 * Implements a multi-pass parser to correlate:
 * 1. Meal Counts from the main grid (preventing 'Cost as Meals' error).
 * 2. Financials from the Summary Table (ensuring 'Available Balance' accuracy).
 * 3. Global parameters like 'Mil Rate'.
 */
export const fetchSheetData = async (url: string): Promise<SheetResult> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }
    const text = await response.text();
    return parseCSV(text);
  } catch (error) {
    console.error("Sheet fetch error:", error);
    throw error;
  }
};

const parseCSV = (csvText: string): SheetResult => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return { people: [], hasContribution: false };

  // Data Holders
  let extractedRate: number | undefined;
  const mealCounts = new Map<string, number>(); // Name -> Meal Count from Grid
  let gridHeaderRowIndex = -1;
  const columnToNameMap = new Map<number, string>();

  // --- PASS 1: Global Scan for Rate & Grid Structure ---
  for (let r = 0; r < lines.length; r++) {
    const rowRaw = lines[r];
    const cells = rowRaw.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
    const lowerCells = cells.map(c => c.toLowerCase());

    // A. Find Mil Rate
    const rateIdx = lowerCells.findIndex(c => c === 'mil rate' || c === 'meal rate' || c === 'rate');
    if (rateIdx !== -1 && rateIdx + 1 < cells.length) {
       const val = parseFloat(cells[rateIdx + 1]);
       if (!isNaN(val) && val > 0) extractedRate = val;
    }

    // B. Identify Meal Grid Header
    // Heuristic: Starts with "Date", followed by names that are NOT "Joma" or "Total"
    // We'll use this to map columns to names for the Total row later.
    if (lowerCells[0] === 'date') {
       // Check if this looks like the main meal grid (lots of names)
       let validNames = 0;
       cells.forEach((cell, idx) => {
         if (idx > 0 && cell && cell.toLowerCase() !== 'joma' && cell.toLowerCase() !== 'total' && cell.toLowerCase() !== 'tot / day') {
           columnToNameMap.set(idx, cell);
           validNames++;
         }
       });
       
       // If we found a row with names, mark it as header
       if (validNames > 1) {
         gridHeaderRowIndex = r;
       }
    }

    // C. Capture Totals from Grid
    // If we have a map of columns, and this row starts with "Total", grab the meals.
    if (gridHeaderRowIndex !== -1 && r > gridHeaderRowIndex && lowerCells[0] === 'total') {
       columnToNameMap.forEach((name, colIdx) => {
          if (colIdx < cells.length) {
             const val = parseFloat(cells[colIdx]);
             // Filter out likely currency values if they are huge compared to typical meals (heuristic)
             // But valid meals can be anything. We rely on the fact that the Meal Grid Total row 
             // is usually the first "Total" row encountered after the header in this structure.
             if (!isNaN(val)) {
                // Only set if not already set (assuming first Total row is the meal counts)
                if (!mealCounts.has(name.toLowerCase())) {
                   mealCounts.set(name.toLowerCase(), val);
                }
             }
          }
       });
    }
  }

  // --- PASS 2: Parse Summary Table & Merge ---
  // We prefer the Summary Table for Cost/Balance because it's the final authority.
  // We prefer the Grid (mealCounts) for the Meal Count.
  
  for (let r = 0; r < lines.length; r++) {
    const rowRaw = lines[r];
    const cells = rowRaw.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
    const lowerCells = cells.map(c => c.toLowerCase());

    // Find Summary Table Header
    const nameIdx = lowerCells.findIndex(c => c.includes('meal details') || c === 'name');
    
    if (nameIdx !== -1) {
      const costIdx = lowerCells.findIndex((c, idx) => idx > nameIdx && (c === 'cost' || c.includes('total cost')));
      // "Available Balance" might be split or distinct. Look for "balance" broadly but ensure it's to the right.
      const balanceIdx = lowerCells.findIndex((c, idx) => idx > nameIdx && (c.includes('available') || c.includes('balance')));

      if (costIdx !== -1 && balanceIdx !== -1) {
        const people: Person[] = [];
        
        for (let i = r + 1; i < lines.length; i++) {
           const dataRow = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
           if (dataRow.length <= Math.max(nameIdx, costIdx, balanceIdx)) break;

           const name = dataRow[nameIdx];
           // Stop on totals or empty
           if (!name || name.toLowerCase().includes('total') || name.toLowerCase() === 'check') break;

           const costStr = dataRow[costIdx];
           const balanceStr = dataRow[balanceIdx];

           if (costStr === '' && balanceStr === '') break;

           const cost = parseFloat(costStr) || 0;
           const balance = parseFloat(balanceStr) || 0;

           // DETERMINE MEALS:
           // 1. Try to find explicit count from Grid (Most Accurate)
           // 2. Fallback: Calculate from Rate (Approximation)
           // 3. Fallback: 0
           let meals = 0;
           const gridMeals = mealCounts.get(name.toLowerCase());
           
           if (gridMeals !== undefined) {
             meals = gridMeals;
           } else if (extractedRate && extractedRate > 0) {
             meals = parseFloat((cost / extractedRate).toFixed(2));
           }

           people.push({
             id: `sheet-summary-${i}`,
             name: name,
             email: `${name.toLowerCase().replace(/\s/g, '')}@example.com`,
             meals: meals, 
             contribution: cost + balance, // Reverse calculate contribution so App logic (Contrib - Cost) works somewhat, but we rely on customBalance.
             customBalance: balance // Force exact balance
           });
        }
        
        if (people.length > 0) {
          return { people, hasContribution: true, extractedRate };
        }
      }
    }
  }

  // Fallback: Simple List
  // ... (Same as before)
  const headers = lines[0].toLowerCase().split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const simpleNameIdx = headers.findIndex(h => h.includes('name') || h.includes('member'));
  const simpleMealIdx = headers.findIndex(h => h.includes('meal') || h.includes('count'));
  const simplePaidIdx = headers.findIndex(h => h.includes('paid') || h.includes('amount'));

  if (simpleNameIdx !== -1 && simpleMealIdx !== -1) {
    const people: Person[] = [];
    for (let i = 1; i < lines.length; i++) {
       const parts = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').trim());
       if (parts.length <= simpleNameIdx) continue;
       const name = parts[simpleNameIdx];
       if (!name) continue;
       
       people.push({
         id: `sheet-list-${i}`,
         name: name,
         email: `${name}@example.com`,
         meals: parseFloat(parts[simpleMealIdx]) || 0,
         contribution: simplePaidIdx !== -1 ? (parseFloat(parts[simplePaidIdx]) || 0) : 0
       });
    }
    return { people, hasContribution: simplePaidIdx !== -1 };
  }

  return { people: [], hasContribution: false };
};