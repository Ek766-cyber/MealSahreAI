import mongoose, { Schema, Document } from 'mongoose';

export interface IMember extends Document {
  userId: mongoose.Types.ObjectId;
  sheetName: string;
  email: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sheetName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound index to ensure unique sheet names per user
MemberSchema.index({ userId: 1, sheetName: 1 }, { unique: true });

export default mongoose.model<IMember>('Member', MemberSchema);
