import express from 'express';
import Quiz from '../models/Quiz.js';
import Subject from '../models/Subject.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validateQuiz } from '../middlewares/validation.js';
import geminiService from '../utils/geminiService.js';

const router = express.Router();

// Generate quiz for a subject
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { subjectId, numberOfQuestions = 10 } = req.body;

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

    // Check if quiz already exists
    const existingQuiz = await Quiz.findOne({
      subject: subjectId,
      user: req.user.id,
      isActive: true
    });

    if (existingQuiz) {
      return res.status(400).json({ message: 'Quiz already exists for this subject' });
    }

    // Generate quiz using AI
    const aiResponse = await geminiService.generateQuiz(
      subject.syllabus,
      subject.name,
      numberOfQuestions
    );

    // Create quiz
    const quiz = new Quiz({
      user: req.user.id,
      subject: subjectId,
      title: aiResponse.title,
      description: aiResponse.description,
      questions: aiResponse.questions,
      aiGenerated: true
    });

    await quiz.save();

    // Update subject metadata
    subject.metadata.hasQuiz = true;
    await subject.save();

    res.status(201).json({
      message: 'Quiz generated successfully',
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        questionsCount: quiz.questions.length,
        settings: quiz.settings
      }
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ 
      message: 'Failed to generate quiz',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get quiz for a subject
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

    // Get quiz
    const quiz = await Quiz.findOne({
      subject: subjectId,
      user: req.user.id,
      isActive: true
    }).populate('subject', 'name');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found for this subject' });
    }

    res.json({
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        subject: quiz.subject,
        questions: quiz.questions,
        settings: quiz.settings,
        stats: quiz.stats,
        createdAt: quiz.createdAt
      }
    });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ 
      message: 'Failed to get quiz',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get quiz by ID
router.get('/quiz/:id', authenticateToken, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    }).populate('subject', 'name');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json({
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        subject: quiz.subject,
        questions: quiz.questions,
        settings: quiz.settings,
        stats: quiz.stats,
        attempts: quiz.attempts,
        createdAt: quiz.createdAt
      }
    });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ 
      message: 'Failed to get quiz',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Start quiz attempt
router.post('/quiz/:id/start', authenticateToken, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if retakes are allowed
    if (quiz.attempts.length > 0 && !quiz.settings.allowRetake) {
      return res.status(400).json({ message: 'Quiz retakes are not allowed' });
    }

    // Create new attempt
    const attempt = {
      attemptNumber: quiz.attempts.length + 1,
      startTime: new Date(),
      answers: [],
      totalQuestions: quiz.questions.length,
      completed: false
    };

    quiz.attempts.push(attempt);
    await quiz.save();

    res.json({
      message: 'Quiz attempt started',
      attempt: {
        id: attempt._id,
        attemptNumber: attempt.attemptNumber,
        startTime: attempt.startTime,
        totalQuestions: attempt.totalQuestions,
        timeLimit: quiz.settings.timeLimit
      }
    });
  } catch (error) {
    console.error('Start quiz error:', error);
    res.status(500).json({ 
      message: 'Failed to start quiz',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Submit quiz answer
router.post('/quiz/:id/answer', authenticateToken, async (req, res) => {
  try {
    const { attemptId, questionIndex, selectedAnswer, timeSpent } = req.body;

    if (selectedAnswer === undefined || questionIndex === undefined) {
      return res.status(400).json({ message: 'Question index and selected answer are required' });
    }

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Find the attempt
    const attempt = quiz.attempts.id(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    if (attempt.completed) {
      return res.status(400).json({ message: 'Quiz attempt already completed' });
    }

    // Validate question index
    if (questionIndex >= quiz.questions.length) {
      return res.status(400).json({ message: 'Invalid question index' });
    }

    const question = quiz.questions[questionIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;

    // Add or update answer
    const existingAnswerIndex = attempt.answers.findIndex(a => a.questionIndex === questionIndex);
    const answerData = {
      questionIndex,
      selectedAnswer,
      isCorrect,
      timeSpent: timeSpent || 0
    };

    if (existingAnswerIndex >= 0) {
      attempt.answers[existingAnswerIndex] = answerData;
    } else {
      attempt.answers.push(answerData);
    }

    await quiz.save();

    res.json({
      message: 'Answer submitted successfully',
      isCorrect,
      explanation: quiz.settings.showCorrectAnswers ? question.explanation : undefined
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ 
      message: 'Failed to submit answer',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Complete quiz attempt
router.post('/quiz/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.body;

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Find the attempt
    const attempt = quiz.attempts.id(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    if (attempt.completed) {
      return res.status(400).json({ message: 'Quiz attempt already completed' });
    }

    // Complete the attempt
    attempt.endTime = new Date();
    attempt.completed = true;
    attempt.correctAnswers = attempt.answers.filter(a => a.isCorrect).length;
    attempt.percentage = Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100);
    attempt.score = attempt.correctAnswers;

    await quiz.save();

    res.json({
      message: 'Quiz completed successfully',
      result: {
        score: attempt.score,
        correctAnswers: attempt.correctAnswers,
        totalQuestions: attempt.totalQuestions,
        percentage: attempt.percentage,
        timeSpent: Math.round((attempt.endTime - attempt.startTime) / 1000 / 60), // in minutes
        answers: quiz.settings.showCorrectAnswers ? attempt.answers.map(answer => ({
          questionIndex: answer.questionIndex,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: answer.isCorrect,
          correctAnswer: quiz.questions[answer.questionIndex].correctAnswer,
          explanation: quiz.questions[answer.questionIndex].explanation
        })) : undefined
      }
    });
  } catch (error) {
    console.error('Complete quiz error:', error);
    res.status(500).json({ 
      message: 'Failed to complete quiz',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get quiz analytics
router.get('/quiz/:id/analytics', authenticateToken, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    }).populate('subject', 'name');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const analytics = quiz.getPerformanceAnalytics();

    res.json({
      analytics: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          subject: quiz.subject
        },
        performance: analytics,
        recentAttempts: quiz.attempts.slice(-5).map(attempt => ({
          attemptNumber: attempt.attemptNumber,
          score: attempt.percentage,
          completedAt: attempt.endTime
        }))
      }
    });
  } catch (error) {
    console.error('Get quiz analytics error:', error);
    res.status(500).json({ 
      message: 'Failed to get quiz analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update quiz settings
router.patch('/quiz/:id/settings', authenticateToken, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({ message: 'Settings are required' });
    }

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Update settings
    quiz.settings = { ...quiz.settings, ...settings };
    await quiz.save();

    res.json({
      message: 'Quiz settings updated successfully',
      settings: quiz.settings
    });
  } catch (error) {
    console.error('Update quiz settings error:', error);
    res.status(500).json({ 
      message: 'Failed to update quiz settings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete quiz
router.delete('/quiz/:id', authenticateToken, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Soft delete
    quiz.isActive = false;
    await quiz.save();

    // Update subject metadata
    const subject = await Subject.findById(quiz.subject);
    if (subject) {
      subject.metadata.hasQuiz = false;
      await subject.save();
    }

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Quiz deletion error:', error);
    res.status(500).json({ 
      message: 'Failed to delete quiz',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;