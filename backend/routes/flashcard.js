import express from 'express';
import Flashcard from '../models/Flashcard.js';
import Subject from '../models/Subject.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validateFlashcard } from '../middlewares/validation.js';
import geminiService from '../utils/geminiService.js';

const router = express.Router();

// Generate flashcards for a subject
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { subjectId } = req.body;

    if (!subjectId) {
      return res.status(400).json({ message: 'Subject ID is required' });
    }

    // Find the subject
    const subject = await Subject.findOne({
      _id: subjectId,
      user: req.user.id,
      isActive: true
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check if flashcards already exist
    const existingFlashcards = await Flashcard.find({
      subject: subjectId,
      user: req.user.id,
      isActive: true
    });

    if (existingFlashcards.length > 0) {
      return res.status(400).json({ message: 'Flashcards already exist for this subject' });
    }

    // Generate flashcards using AI
    const aiResponse = await geminiService.generateFlashcards(
      subject.syllabus,
      subject.name
    );

    // Create flashcards
    const flashcards = [];
    for (const flashcardData of aiResponse.flashcards) {
      const flashcard = new Flashcard({
        user: req.user.id,
        subject: subjectId,
        question: flashcardData.question,
        answer: flashcardData.answer,
        topic: flashcardData.topic,
        difficulty: flashcardData.difficulty,
        tags: flashcardData.tags || [],
        aiGenerated: true
      });
      
      flashcards.push(flashcard);
    }

    await Flashcard.insertMany(flashcards);

    // Update subject metadata
    subject.metadata.hasFlashcards = true;
    await subject.save();

    res.status(201).json({
      message: 'Flashcards generated successfully',
      flashcardsCount: flashcards.length,
      flashcards: flashcards.map(card => ({
        id: card._id,
        question: card.question,
        answer: card.answer,
        topic: card.topic,
        difficulty: card.difficulty,
        tags: card.tags
      }))
    });
  } catch (error) {
    console.error('Flashcard generation error:', error);
    res.status(500).json({ 
      message: 'Failed to generate flashcards',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get flashcards for a subject
router.get('/:subjectId', authenticateToken, async (req, res) => {
  try {
    const { subjectId } = req.params;

    // Verify subject exists and belongs to user
    const subject = await Subject.findOne({
      _id: subjectId,
      user: req.user.id,
      isActive: true
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Get flashcards
    const flashcards = await Flashcard.find({
      subject: subjectId,
      user: req.user.id,
      isActive: true
    }).sort({ createdAt: -1 });

    res.json({
      flashcards: flashcards.map(card => ({
        id: card._id,
        question: card.question,
        answer: card.answer,
        topic: card.topic,
        difficulty: card.difficulty,
        tags: card.tags,
        stats: card.stats,
        successRate: card.successRate,
        isDue: card.isDue,
        createdAt: card.createdAt
      }))
    });
  } catch (error) {
    console.error('Get flashcards error:', error);
    res.status(500).json({ 
      message: 'Failed to get flashcards',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get single flashcard
router.get('/card/:id', authenticateToken, async (req, res) => {
  try {
    const flashcard = await Flashcard.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    }).populate('subject', 'name');

    if (!flashcard) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    res.json({
      flashcard: {
        id: flashcard._id,
        question: flashcard.question,
        answer: flashcard.answer,
        topic: flashcard.topic,
        difficulty: flashcard.difficulty,
        tags: flashcard.tags,
        stats: flashcard.stats,
        reviewData: flashcard.reviewData,
        successRate: flashcard.successRate,
        isDue: flashcard.isDue,
        subject: flashcard.subject,
        createdAt: flashcard.createdAt
      }
    });
  } catch (error) {
    console.error('Get flashcard error:', error);
    res.status(500).json({ 
      message: 'Failed to get flashcard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Review flashcard (update stats and spaced repetition)
router.post('/card/:id/review', authenticateToken, async (req, res) => {
  try {
    const { quality, responseTime } = req.body;

    if (quality === undefined || quality < 0 || quality > 5) {
      return res.status(400).json({ message: 'Quality must be between 0 and 5' });
    }

    const flashcard = await Flashcard.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!flashcard) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    // Update response time if provided
    if (responseTime) {
      const newTotalTime = (flashcard.stats.averageResponseTime * flashcard.stats.timesReviewed) + responseTime;
      flashcard.stats.averageResponseTime = newTotalTime / (flashcard.stats.timesReviewed + 1);
    }

    // Update review data using spaced repetition
    await flashcard.updateReviewData(quality);

    res.json({
      message: 'Flashcard reviewed successfully',
      flashcard: {
        id: flashcard._id,
        stats: flashcard.stats,
        reviewData: flashcard.reviewData,
        successRate: flashcard.successRate,
        isDue: flashcard.isDue,
        nextReview: flashcard.reviewData.nextReview
      }
    });
  } catch (error) {
    console.error('Flashcard review error:', error);
    res.status(500).json({ 
      message: 'Failed to review flashcard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get due flashcards for review
router.get('/due/:subjectId?', authenticateToken, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const query = {
      user: req.user.id,
      isActive: true,
      'reviewData.nextReview': { $lte: new Date() }
    };

    if (subjectId) {
      query.subject = subjectId;
    }

    const dueFlashcards = await Flashcard.find(query)
      .populate('subject', 'name')
      .sort({ 'reviewData.nextReview': 1 })
      .limit(20); // Limit to 20 cards per session

    res.json({
      dueFlashcards: dueFlashcards.map(card => ({
        id: card._id,
        question: card.question,
        answer: card.answer,
        topic: card.topic,
        difficulty: card.difficulty,
        subject: card.subject,
        stats: card.stats,
        successRate: card.successRate,
        nextReview: card.reviewData.nextReview
      }))
    });
  } catch (error) {
    console.error('Get due flashcards error:', error);
    res.status(500).json({ 
      message: 'Failed to get due flashcards',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create custom flashcard
router.post('/custom', authenticateToken, validateFlashcard, async (req, res) => {
  try {
    const { question, answer, topic, difficulty, tags, subjectId } = req.body;

    // Verify subject exists
    const subject = await Subject.findOne({
      _id: subjectId,
      user: req.user.id,
      isActive: true
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const flashcard = new Flashcard({
      user: req.user.id,
      subject: subjectId,
      question,
      answer,
      topic,
      difficulty,
      tags: tags || [],
      aiGenerated: false
    });

    await flashcard.save();

    res.status(201).json({
      message: 'Custom flashcard created successfully',
      flashcard: {
        id: flashcard._id,
        question: flashcard.question,
        answer: flashcard.answer,
        topic: flashcard.topic,
        difficulty: flashcard.difficulty,
        tags: flashcard.tags
      }
    });
  } catch (error) {
    console.error('Custom flashcard creation error:', error);
    res.status(500).json({ 
      message: 'Failed to create custom flashcard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update flashcard
router.patch('/card/:id', authenticateToken, async (req, res) => {
  try {
    const allowedUpdates = ['question', 'answer', 'topic', 'difficulty', 'tags'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid update fields' });
    }

    const flashcard = await Flashcard.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!flashcard) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    // Apply updates
    updates.forEach(update => {
      flashcard[update] = req.body[update];
    });

    await flashcard.save();

    res.json({
      message: 'Flashcard updated successfully',
      flashcard: {
        id: flashcard._id,
        question: flashcard.question,
        answer: flashcard.answer,
        topic: flashcard.topic,
        difficulty: flashcard.difficulty,
        tags: flashcard.tags
      }
    });
  } catch (error) {
    console.error('Flashcard update error:', error);
    res.status(500).json({ 
      message: 'Failed to update flashcard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete flashcard
router.delete('/card/:id', authenticateToken, async (req, res) => {
  try {
    const flashcard = await Flashcard.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!flashcard) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    // Soft delete
    flashcard.isActive = false;
    await flashcard.save();

    res.json({ message: 'Flashcard deleted successfully' });
  } catch (error) {
    console.error('Flashcard deletion error:', error);
    res.status(500).json({ 
      message: 'Failed to delete flashcard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;