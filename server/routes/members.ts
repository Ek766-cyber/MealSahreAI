import express, { Request, Response } from 'express';
import Member from '../models/Member.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all member routes
router.use(isAuthenticated);

// @route   GET /api/members
// @desc    Get all members for the authenticated user
// @access  Private
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)._id;
    const members = await Member.find({ userId }).sort({ createdAt: -1 });
    
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// @route   POST /api/members
// @desc    Add a new member
// @access  Private
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)._id;
    const { sheetName, email, phone } = req.body;

    if (!sheetName || !email) {
      return res.status(400).json({ error: 'Sheet name and email are required' });
    }

    // Check if member with same sheetName already exists for this user
    const existingMember = await Member.findOne({ 
      userId, 
      sheetName: { $regex: new RegExp(`^${sheetName}$`, 'i') }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'A member with this Sheet Name already exists' });
    }

    const newMember = new Member({
      userId,
      sheetName,
      email,
      phone
    });

    await newMember.save();
    res.status(201).json(newMember);
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// @route   PUT /api/members/:id
// @desc    Update a member
// @access  Private
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)._id;
    const { id } = req.params;
    const { sheetName, email, phone } = req.body;

    const member = await Member.findOne({ _id: id, userId });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (sheetName) member.sheetName = sheetName;
    if (email) member.email = email;
    if (phone !== undefined) member.phone = phone;

    await member.save();
    res.json(member);
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// @route   DELETE /api/members/:id
// @desc    Delete a member
// @access  Private
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)._id;
    const { id } = req.params;

    const result = await Member.findOneAndDelete({ _id: id, userId });

    if (!result) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

export default router;
