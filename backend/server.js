import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';

// Route imports
import authRoutes from './routes/auth.js';
import syllabusRoutes from './routes/syllabus.js';
import studyPlanRoutes from './routes/studyPlan.js';
import flashcardRoutes from './routes/flashcard.js';
import quizRoutes from './routes/quiz.js';
import dashboardRoutes from './routes/dashboard.js';

// Utility imports
import { sendDailyReminders } from './utils/emailService.js';
import { connectDB } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/study-plan', studyPlanRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'StudyGenie Backend is running!',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Daily reminders cron job (runs every day at 9 AM)
cron.schedule('0 9 * * *', async () => {
  console.log('Running daily reminders cron job...');
  try {
    await sendDailyReminders();
    console.log('Daily reminders sent successfully');
  } catch (error) {
    console.error('Error sending daily reminders:', error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 StudyGenie Backend Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/api/health`);
});

export default app;