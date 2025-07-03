import express from 'express';
import StudyPlan from '../models/StudyPlan.js';
import Subject from '../models/Subject.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validateStudyPlan } from '../middlewares/validation.js';
import geminiService from '../utils/geminiService.js';

const router = express.Router();

// Generate study plan for a subject
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

    // Check if study plan already exists
    const existingPlan = await StudyPlan.findOne({
      subject: subjectId,
      user: req.user.id,
      isActive: true
    });

    if (existingPlan) {
      return res.status(400).json({ message: 'Study plan already exists for this subject' });
    }

    // Generate study plan using AI
    const aiResponse = await geminiService.generateStudyPlan(
      subject.syllabus,
      subject.name,
      subject.examDate
    );

    // Create study plan
    const studyPlan = new StudyPlan({
      user: req.user.id,
      subject: subjectId,
      title: aiResponse.title,
      description: aiResponse.description,
      startDate: new Date(),
      endDate: subject.examDate,
      totalDuration: aiResponse.totalDuration,
      dailyTasks: aiResponse.dailyTasks.map((task, index) => ({
        day: task.day,
        date: new Date(Date.now() + (index * 24 * 60 * 60 * 1000)), // Add days from today
        topic: task.topic,
        description: task.description,
        estimatedTime: task.estimatedTime,
        difficulty: task.difficulty
      })),
      aiGenerated: true
    });

    await studyPlan.save();

    // Update subject metadata
    subject.metadata.hasStudyPlan = true;
    await subject.save();

    res.status(201).json({
      message: 'Study plan generated successfully',
      studyPlan: {
        id: studyPlan._id,
        title: studyPlan.title,
        description: studyPlan.description,
        totalDuration: studyPlan.totalDuration,
        progress: studyPlan.progress,
        dailyTasksCount: studyPlan.dailyTasks.length
      }
    });
  } catch (error) {
    console.error('Study plan generation error:', error);
    res.status(500).json({ 
      message: 'Failed to generate study plan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get study plan for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const studyPlans = await StudyPlan.find({ 
      user: req.user.id, 
      isActive: true 
    }).populate('subject', 'name examDate');

    if (!studyPlans || studyPlans.length === 0) {
      return res.json({ studyPlans: [] });
    }

    // Get current study plan (most recent or active)
    const currentPlan = studyPlans[0];
    const todaysTasks = currentPlan.getTodaysTasks();
    const upcomingTasks = currentPlan.getUpcomingTasks(7);

    res.json({
      studyPlan: {
        id: currentPlan._id,
        title: currentPlan.title,
        description: currentPlan.description,
        subject: currentPlan.subject,
        progress: currentPlan.progress,
        dailyTasks: currentPlan.dailyTasks.map(task => ({
          id: task._id,
          day: task.day,
          date: task.date,
          topic: task.topic,
          description: task.description,
          estimatedTime: task.estimatedTime,
          difficulty: task.difficulty,
          completed: task.completed,
          completedAt: task.completedAt
        })),
        todaysTasks,
        upcomingTasks
      }
    });
  } catch (error) {
    console.error('Get study plan error:', error);
    res.status(500).json({ 
      message: 'Failed to get study plan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get specific study plan
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const studyPlan = await StudyPlan.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    }).populate('subject', 'name examDate');

    if (!studyPlan) {
      return res.status(404).json({ message: 'Study plan not found' });
    }

    res.json({
      studyPlan: {
        id: studyPlan._id,
        title: studyPlan.title,
        description: studyPlan.description,
        subject: studyPlan.subject,
        startDate: studyPlan.startDate,
        endDate: studyPlan.endDate,
        totalDuration: studyPlan.totalDuration,
        progress: studyPlan.progress,
        dailyTasks: studyPlan.dailyTasks,
        aiGenerated: studyPlan.aiGenerated,
        createdAt: studyPlan.createdAt
      }
    });
  } catch (error) {
    console.error('Get study plan error:', error);
    res.status(500).json({ 
      message: 'Failed to get study plan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update study plan
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const allowedUpdates = ['title', 'description', 'dailyTasks'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid update fields' });
    }

    const studyPlan = await StudyPlan.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!studyPlan) {
      return res.status(404).json({ message: 'Study plan not found' });
    }

    // Apply updates
    updates.forEach(update => {
      studyPlan[update] = req.body[update];
    });

    await studyPlan.save();

    res.json({
      message: 'Study plan updated successfully',
      studyPlan: {
        id: studyPlan._id,
        title: studyPlan.title,
        description: studyPlan.description,
        progress: studyPlan.progress,
        dailyTasksCount: studyPlan.dailyTasks.length
      }
    });
  } catch (error) {
    console.error('Study plan update error:', error);
    res.status(500).json({ 
      message: 'Failed to update study plan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete study plan
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const studyPlan = await StudyPlan.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!studyPlan) {
      return res.status(404).json({ message: 'Study plan not found' });
    }

    // Soft delete
    studyPlan.isActive = false;
    await studyPlan.save();

    // Update subject metadata
    const subject = await Subject.findById(studyPlan.subject);
    if (subject) {
      subject.metadata.hasStudyPlan = false;
      await subject.save();
    }

    res.json({ message: 'Study plan deleted successfully' });
  } catch (error) {
    console.error('Study plan deletion error:', error);
    res.status(500).json({ 
      message: 'Failed to delete study plan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;