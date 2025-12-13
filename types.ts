export interface Person {
  id: string;
  name: string;
  email: string;
  meals: number;       // Number of meals consumed
  contribution: number; // Total money paid or 'Bazar' done
  customBalance?: number; // Optional: Force a specific balance (e.g. from Sheet)
}

export interface Expense {
  id: string;
  payerId: string;
  amount: number;
  description: string;
  date: string;
}

export interface Balance {
  personId: string;
  name: string;
  meals: number;
  contribution: number;
  cost: number;        // The calculated cost for their meals
  balance: number;     // contribution - cost
  status: 'OWES' | 'OWED' | 'SETTLED';
}

export interface Reminder {
  personId: string;
  name: string;
  amountOwed: number;
  message: string;
  generatedAt: number;
}

export enum NotificationMode {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED'
}

// Database Records
export interface DBMember {
  _id: string;
  sheetName: string; // The name exactly as it appears in the Google Sheet
  email: string;     // The actual email to contact
  phone?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  photoURL?: string; // New field for Google Avatar
}