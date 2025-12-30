import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  googleId: string;
  email: string;
  name: string;
  photoURL?: string;
  csvUrl?: string;
  lastFetchTime?: Date;
  createdAt: Date;
  lastLogin: Date;
  
  // Synced data storage
  syncedPeople?: any[];
  sheetMealRate?: number;
  
  // Auto-sync scheduler settings
  autoSyncEnabled?: boolean;
  autoSyncTime?: string;
  
  // Notification center configuration
  notificationConfig?: {
    scheduledTime?: string;
    threshold?: number;
    emailEnabled?: boolean;
    autoSend?: boolean;
    isEnabled?: boolean;
    tone?: string;
  };
}

const UserSchema: Schema = new Schema({
  googleId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  photoURL: {
    type: String,
    default: null
  },
  csvUrl: {
    type: String,
    default: null
  },
  lastFetchTime: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  // Synced data storage
  syncedPeople: {
    type: [Schema.Types.Mixed],
    default: []
  },
  sheetMealRate: {
    type: Number,
    default: null
  },
  
  // Auto-sync scheduler settings
  autoSyncEnabled: {
    type: Boolean,
    default: false
  },
  autoSyncTime: {
    type: String,
    default: '09:00'
  },
  
  // Notification center configuration
  notificationConfig: {
    type: {
      scheduledTime: { type: String, default: '18:00' },
      threshold: { type: Number, default: 100 },
      emailEnabled: { type: Boolean, default: false },
      autoSend: { type: Boolean, default: false },
      isEnabled: { type: Boolean, default: false },
      tone: { type: String, default: 'friendly' }
    },
    default: () => ({
      scheduledTime: '18:00',
      threshold: 100,
      emailEnabled: false,
      autoSend: false,
      isEnabled: false,
      tone: 'friendly'
    })
  }
});

export default mongoose.model<IUser>('User', UserSchema);
