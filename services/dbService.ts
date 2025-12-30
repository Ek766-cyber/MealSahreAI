import { DBMember } from '../types';

/**
 * MONGODB SERVICE
 * This service now makes API calls to the backend server
 * which connects to MongoDB.
 */

// Support both browser (import.meta.env) and Node.js (process.env)
const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) 
  ? import.meta.env.VITE_API_URL 
  : (typeof process !== 'undefined' && process.env?.VITE_API_URL) 
  ? process.env.VITE_API_URL 
  : 'http://localhost:5000';

export const dbService = {
  // Fetch all members from MongoDB
  getMembers: async (): Promise<DBMember[]> => {
    try {
      const response = await fetch(`${API_URL}/api/members`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }

      const members = await response.json();
      
      // Transform MongoDB documents to match DBMember interface
      return members.map((m: any) => ({
        _id: m._id,
        sheetName: m.sheetName,
        email: m.email,
        phone: m.phone
      }));
    } catch (error) {
      console.error('Error fetching members:', error);
      return [];
    }
  },

  // Add a member to MongoDB
  addMember: async (member: Omit<DBMember, '_id'>): Promise<DBMember> => {
    try {
      const response = await fetch(`${API_URL}/api/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(member)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add member');
      }

      const newMember = await response.json();
      
      return {
        _id: newMember._id,
        sheetName: newMember.sheetName,
        email: newMember.email,
        phone: newMember.phone
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to add member');
    }
  },

  // Update a member
  updateMember: async (id: string, updates: Partial<DBMember>): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/members/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update member');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update member');
    }
  },

  // Delete a member
  deleteMember: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/members/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete member');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete member');
    }
  }
};