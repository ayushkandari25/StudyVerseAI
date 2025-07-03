import express from 'express';
import StudyPlan from '../models/StudyPlan.js';
import Subject from '../models/Subject.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import User from '../models/User.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

// Get dashboard data
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get user's subjects
    const subjects = await Subject.find({ 
      user: req.user.id, 
      isActive: true 
    }).select('name examDate progress metadata');

    // Get study plans
    const studyPlans = await StudyPlan.find({ 
      user: req.user.id, 
      isActive: true 
    }).populate('subject', 'name examDate');

    // Get today's tasks from all study plans
    let todayTasks = [];
    let upcomingTasks = [];
    
    for (const plan of studyPlans) {
      const todayPlanTasks = plan.getTodaysTasks();
      const upcomingPlanTasks = plan.getUpcomingTasks(7);
      
      todayTasks.push(...todayPlanTasks.map(task => ({
        id: task._id,
        title: task.topic,
        description: task.description,
        subject: plan.subject.name,
        estimatedTime: task.estimatedTime,
        difficulty: task.difficulty,
        completed: task.completed,
        completedAt: task.completedAt
      })));
      
      upcomingTasks.push(...upcomingPlanTasks.map(task => ({
        id: task._id,
        title: task.topic,
        description: task.description,
        subject: plan.subject.name,
        date: task.date,
        estimatedTime: task.estimatedTime,
        difficulty: task.difficulty
      })));
    }

    // Get upcoming exams (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const upcomingExams = subjects
      .filter(subject => new Date(subject.examDate) <= thirtyDaysFromNow)
      .map(subject => {
        const daysLeft = Math.ceil((new Date(subject.examDate) - new Date()) / (1000 * 60 * 60 * 24));
        return {
          id: subject._id,
          subject: subject.name,
          date: subject.examDate,
          daysLeft: daysLeft > 0 ? daysLeft : 0
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);

    // Calculate overall progress
    const totalTasks = todayTasks.length + upcomingTasks.length;
    const completedTasks = todayTasks.filter(task => task.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Get user stats
    const user = await User.findById(req.user.id);
    const studyStreak = user.studyStats.streak || 0;

    // Get flashcard stats
    const totalFlashcards = await Flashcard.countDocuments({ 
      user: req.user.id, 
      isActive: true 
    });

    const dueFlashcards = await Flashcard.countDocuments({
      user: req.user.id,
      isActive: true,
      'reviewData.nextReview': { $lte: new Date() }
    });

    // Get quiz stats
    const totalQuizzes = await Quiz.countDocuments({ 
      user: req.user.id, 
      isActive: true 
    });

    const recentQuizAttempts = await Quiz.find({
      user: req.user.id,
      isActive: true,
      'attempts.0': { $exists: true }
    }).select('attempts title').limit(5);

    const recentScores = recentQuizAttempts.map(quiz => {
      const lastAttempt = quiz.attempts[quiz.attempts.length - 1];
      return {
        quizTitle: quiz.title,
        score: lastAttempt.percentage,
        date: lastAttempt.endTime
      };
    });

    // Study analytics
    const studyAnalytics = {
      subjectsCount: subjects.length,
      activeStudyPlans: studyPlans.length,
      totalTopics: subjects.reduce((sum, subject) => sum + subject.progress.totalTopics, 0),
      completedTopics: subjects.reduce((sum, subject) => sum + subject.progress.completedTopics, 0),
      averageProgress: subjects.length > 0 ? 
        Math.round(subjects.reduce((sum, subject) => sum + subject.progress.completionPercentage, 0) / subjects.length) : 0
    };

    res.json({
      todayTasks,
      upcomingTasks: upcomingTasks.slice(0, 10), // Limit to 10 upcoming tasks
      subjects: subjects.map(subject => ({
        id: subject._id,
        name: subject.name,
        examDate: subject.examDate,
        progress: subject.progress,
        metadata: subject.metadata,
        daysLeft: Math.ceil((new Date(subject.examDate) - new Date()) / (1000 * 60 * 60 * 24))
      })),
      upcomingExams,
      progress: {
        completionRate,
        streak: studyStreak,
        totalTasks,
        completedTasks
      },
      stats: {
        subjects: subjects.length,
        studyPlans: studyPlans.length,
        flashcards: totalFlashcards,
        dueFlashcards,
        quizzes: totalQuizzes
      },
      analytics: studyAnalytics,
      recentActivity: {
        quizScores: recentScores,
        lastActive: user.studyStats.lastActive
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      message: 'Failed to get dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Mark topic as complete
router.patch('/mark-topic', authenticateToken, async (req, res) => {
  try {
    const { topicId, studyPlanId } = req.body;

    if (!topicId || !studyPlanId) {
      return res.status(400).json({ message: 'Topic ID and Study Plan ID are required' });
    }

    const studyPlan = await StudyPlan.findOne({
      _id: studyPlanId,
      user: req.user.id,
      isActive: true
    });

    if (!studyPlan) {
      return res.status(404).json({ message: 'Study plan not found' });
    }

    const task = studyPlan.dailyTasks.id(topicId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.completed = true;
    task.completedAt = new Date();
    
    await studyPlan.save();

    // Update user stats
    const user = await User.findById(req.user.id);
    user.studyStats.completedTasks += 1;
    user.studyStats.lastActive = new Date();
    
    // Update streak logic
    const today = new Date();
    const lastActive = new Date(user.studyStats.lastActive);
    const daysDiff = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      user.studyStats.streak += 1;
    } else if (daysDiff > 1) {
      user.studyStats.streak = 1;
    }
    
    await user.save();

    res.json({ 
      message: 'Topic marked as complete',
      task: {
        id: task._id,
        topic: task.topic,
        completed: task.completed,
        completedAt: task.completedAt
      },
      newStreak: user.studyStats.streak
    });
  } catch (error) {
    console.error('Mark topic complete error:', error);
    res.status(500).json({ 
      message: 'Failed to mark topic as complete',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get study analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { period = '7' } = req.query;
    const days = parseInt(period);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get completed tasks in the period
    const studyPlans = await StudyPlan.find({ 
      user: req.user.id, 
      isActive: true 
    });

    let completedTasks = 0;
    let totalStudyTime = 0;
    const dailyProgress = {};

    for (const plan of studyPlans) {
      plan.dailyTasks.forEach(task => {
        if (task.completed && task.completedAt >= startDate) {
          completedTasks++;
          totalStudyTime += task.actualTimeSpent || 0;
          
          const dateKey = task.completedAt.toISOString().split('T')[0];
          if (!dailyProgress[dateKey]) {
            dailyProgress[dateKey] = 0;
          }
          dailyProgress[dateKey]++;
        }
      });
    }

    // Get quiz performance
    const quizzes = await Quiz.find({ 
      user: req.user.id, 
      isActive: true 
    });

    const quizStats = {
      totalQuizzes: quizzes.length,
      totalAttempts: quizzes.reduce((sum, quiz) => sum + quiz.attempts.length, 0),
      averageScore: 0,
      bestScore: 0
    };

    if (quizzes.length > 0) {
      const allScores = quizzes.flatMap(quiz => 
        quiz.attempts.filter(attempt => attempt.completed).map(attempt => attempt.percentage)
      );
      
      if (allScores.length > 0) {
        quizStats.averageScore = Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length);
        quizStats.bestScore = Math.max(...allScores);
      }
    }

    // Get flashcard stats
    const flashcards = await Flashcard.find({ 
      user: req.user.id, 
      isActive: true 
    });

    const flashcardStats = {
      total: flashcards.length,
      reviewed: flashcards.filter(card => card.stats.timesReviewed > 0).length,
      averageSuccessRate: 0
    };

    if (flashcards.length > 0) {
      const successRates = flashcards.map(card => card.successRate);
      flashcardStats.averageSuccessRate = Math.round(
        successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length
      );
    }

    res.json({
      period: `${days} days`,
      studyStats: {
        completedTasks,
        totalStudyTime, // in minutes
        dailyProgress
      },
      quizStats,
      flashcardStats,
      overallProgress: {
        subjects: await Subject.countDocuments({ user: req.user.id, isActive: true }),
        studyPlans: studyPlans.length,
        streak: (await User.findById(req.user.id)).studyStats.streak
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      message: 'Failed to get analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;