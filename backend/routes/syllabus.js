import express from 'express';
import Subject from '../models/Subject.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validateSubject } from '../middlewares/validation.js';
import geminiService from '../utils/geminiService.js';

const router = express.Router();

// Upload/Create new subject with syllabus
router.post('/', authenticateToken, validateSubject, async (req, res) => {
  try {
    const { name, syllabus, examDate, description } = req.body;

    // Check if subject already exists for this user
    const existingSubject = await Subject.findOne({
      user: req.user.id,
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingSubject) {
      return res.status(400).json({ message: 'Subject with this name already exists' });
    }

    // Extract topics from syllabus using AI
    let topics = [];
    try {
      const aiResponse = await geminiService.extractTopicsFromSyllabus(syllabus);
      topics = aiResponse.topics || [];
    } catch (error) {
      console.error('AI topic extraction failed:', error);
      // Create default topics if AI fails
      topics = [
        {
          name: 'Introduction and Overview',
          description: 'Basic introduction to the subject',
          estimatedTime: 60,
          difficulty: 'easy'
        }
      ];
    }

    // Create new subject
    const subject = new Subject({
      name,
      syllabus,
      examDate,
      description,
      user: req.user.id,
      topics
    });

    await subject.save();

    res.status(201).json({
      message: 'Subject created successfully',
      subject: {
        id: subject._id,
        name: subject.name,
        description: subject.description,
        examDate: subject.examDate,
        topicsCount: subject.topics.length,
        daysUntilExam: subject.daysUntilExam,
        progress: subject.progress,
        metadata: subject.metadata
      }
    });
  } catch (error) {
    console.error('Subject creation error:', error);
    res.status(500).json({ 
      message: 'Failed to create subject',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all subjects for user
router.get('/subjects', authenticateToken, async (req, res) => {
  try {
    const subjects = await Subject.find({ 
      user: req.user.id, 
      isActive: true 
    }).sort({ createdAt: -1 });

    const formattedSubjects = subjects.map(subject => ({
      id: subject._id,
      name: subject.name,
      description: subject.description,
      examDate: subject.examDate,
      topicsCount: subject.topics.length,
      daysUntilExam: subject.daysUntilExam,
      progress: subject.progress,
      metadata: subject.metadata,
      createdAt: subject.createdAt
    }));

    res.json({ subjects: formattedSubjects });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ 
      message: 'Failed to get subjects',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get single subject with full details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json({
      subject: {
        id: subject._id,
        name: subject.name,
        description: subject.description,
        syllabus: subject.syllabus,
        examDate: subject.examDate,
        topics: subject.topics,
        daysUntilExam: subject.daysUntilExam,
        progress: subject.progress,
        metadata: subject.metadata,
        createdAt: subject.createdAt,
        updatedAt: subject.updatedAt
      }
    });
  } catch (error) {
    console.error('Get subject error:', error);
    res.status(500).json({ 
      message: 'Failed to get subject',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update subject
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'description', 'syllabus', 'examDate'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid update fields' });
    }

    const subject = await Subject.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Apply updates
    updates.forEach(update => {
      subject[update] = req.body[update];
    });

    // If syllabus is updated, re-extract topics
    if (updates.includes('syllabus')) {
      try {
        const aiResponse = await geminiService.extractTopicsFromSyllabus(subject.syllabus);
        subject.topics = aiResponse.topics || subject.topics;
      } catch (error) {
        console.error('AI topic extraction failed during update:', error);
      }
    }

    await subject.save();

    res.json({
      message: 'Subject updated successfully',
      subject: {
        id: subject._id,
        name: subject.name,
        description: subject.description,
        examDate: subject.examDate,
        topicsCount: subject.topics.length,
        daysUntilExam: subject.daysUntilExam,
        progress: subject.progress,
        metadata: subject.metadata
      }
    });
  } catch (error) {
    console.error('Subject update error:', error);
    res.status(500).json({ 
      message: 'Failed to update subject',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete subject
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Soft delete by setting isActive to false
    subject.isActive = false;
    await subject.save();

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Subject deletion error:', error);
    res.status(500).json({ 
      message: 'Failed to delete subject',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Mark topic as complete
router.patch('/:id/topics/:topicId/complete', authenticateToken, async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const topic = subject.topics.id(req.params.topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    topic.completed = true;
    topic.completedAt = new Date();
    
    await subject.save();

    res.json({ 
      message: 'Topic marked as complete',
      topic: {
        id: topic._id,
        name: topic.name,
        completed: topic.completed,
        completedAt: topic.completedAt
      }
    });
  } catch (error) {
    console.error('Topic completion error:', error);
    res.status(500).json({ 
      message: 'Failed to mark topic as complete',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;