import { DBMember } from '../types';

/**
 * SIMULATED MONGODB SERVICE
 * In a real production app, these functions would make API calls (fetch/axios)
 * to your backend server which connects to MongoDB.
 * 
 * For this demo, we use LocalStorage so you can verify the functionality immediately.
 */

const DB_KEY = 'mealshare_db_members';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const dbService = {
  // Simulate fetching all members from MongoDB
  getMembers: async (): Promise<DBMember[]> => {
    await delay(300); // Simulate network latency
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  // Simulate adding a member to MongoDB
  addMember: async (member: Omit<DBMember, '_id'>): Promise<DBMember> => {
    await delay(300);
    const members = await dbService.getMembers();
    
    // Check duplicates
    if (members.find(m => m.sheetName.toLowerCase() === member.sheetName.toLowerCase())) {
      throw new Error("A member with this Sheet Name already exists.");
    }

    const newMember: DBMember = { ...member, _id: Date.now().toString() };
    members.push(newMember);
    localStorage.setItem(DB_KEY, JSON.stringify(members));
    return newMember;
  },

  // Simulate updating a member
  updateMember: async (id: string, updates: Partial<DBMember>): Promise<void> => {
    await delay(200);
    const members = await dbService.getMembers();
    const idx = members.findIndex(m => m._id === id);
    if (idx !== -1) {
      members[idx] = { ...members[idx], ...updates };
      localStorage.setItem(DB_KEY, JSON.stringify(members));
    }
  },

  // Simulate deleting a member
  deleteMember: async (id: string): Promise<void> => {
    await delay(200);
    const members = await dbService.getMembers();
    const filtered = members.filter(m => m._id !== id);
    localStorage.setItem(DB_KEY, JSON.stringify(filtered));
  }
};