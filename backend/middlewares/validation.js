import { body, validationResult } from 'express-validator';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
export const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  
  validateRequest
];

export const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  validateRequest
];

// Subject validation rules
export const validateSubject = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Subject name must be between 2 and 100 characters'),
  
  body('syllabus')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Syllabus must be at least 10 characters long'),
  
  body('examDate')
    .isISO8601()
    .withMessage('Please provide a valid exam date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Exam date must be in the future');
      }
      return true;
    }),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  validateRequest
];

// Flashcard validation rules
export const validateFlashcard = [
  body('question')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Question must be at least 5 characters long'),
  
  body('answer')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Answer is required'),
  
  body('topic')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Topic is required'),
  
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  
  validateRequest
];

// Quiz validation rules
export const validateQuiz = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Quiz title must be between 3 and 100 characters'),
  
  body('questions')
    .isArray({ min: 1 })
    .withMessage('Quiz must have at least one question'),
  
  body('questions.*.question')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Each question must be at least 10 characters long'),
  
  body('questions.*.options')
    .isArray({ min: 2, max: 6 })
    .withMessage('Each question must have between 2 and 6 options'),
  
  body('questions.*.correctAnswer')
    .isInt({ min: 0 })
    .withMessage('Correct answer must be a valid option index'),
  
  validateRequest
];

// Study plan validation rules
export const validateStudyPlan = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Study plan title must be between 3 and 100 characters'),
  
  body('subject')
    .isMongoId()
    .withMessage('Valid subject ID is required'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid end date'),
  
  validateRequest
];

// Generic ID validation
export const validateId = [
  body('id')
    .isMongoId()
    .withMessage('Valid ID is required'),
  
  validateRequest
];