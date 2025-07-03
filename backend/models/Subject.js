import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    maxlength: [100, 'Subject name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  syllabus: {
    type: String,
    required: [true, 'Syllabus content is required'],
    minlength: [10, 'Syllabus must be at least 10 characters long']
  },
  examDate: {
    type: Date,
    required: [true, 'Exam date is required'],
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'Exam date must be in the future'
    }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topics: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    estimatedTime: {
      type: Number, // in minutes
      default: 60
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  progress: {
    totalTopics: {
      type: Number,
      default: 0
    },
    completedTopics: {
      type: Number,
      default: 0
    },
    completionPercentage: {
      type: Number,
      default: 0
    },
    lastStudied: {
      type: Date
    }
  },
  metadata: {
    hasStudyPlan: {
      type: Boolean,
      default: false
    },
    hasFlashcards: {
      type: Boolean,
      default: false
    },
    hasQuiz: {
      type: Boolean,
      default: false
    },
    aiGenerated: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Calculate progress before saving
subjectSchema.pre('save', function(next) {
  if (this.topics && this.topics.length > 0) {
    this.progress.totalTopics = this.topics.length;
    this.progress.completedTopics = this.topics.filter(topic => topic.completed).length;
    this.progress.completionPercentage = Math.round(
      (this.progress.completedTopics / this.progress.totalTopics) * 100
    );
  }
  next();
});

// Calculate days until exam
subjectSchema.virtual('daysUntilExam').get(function() {
  const today = new Date();
  const examDate = new Date(this.examDate);
  const diffTime = examDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Ensure virtual fields are included in JSON
subjectSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Subject', subjectSchema);