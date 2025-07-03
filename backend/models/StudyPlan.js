import mongoose from 'mongoose';

const studyPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Study plan title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  totalDuration: {
    type: Number, // in days
    required: true
  },
  dailyTasks: [{
    day: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    topic: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    estimatedTime: {
      type: String, // e.g., "2 hours", "90 minutes"
      required: true
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
    },
    actualTimeSpent: {
      type: Number, // in minutes
      default: 0
    }
  }],
  progress: {
    totalTasks: {
      type: Number,
      default: 0
    },
    completedTasks: {
      type: Number,
      default: 0
    },
    completionPercentage: {
      type: Number,
      default: 0
    },
    streak: {
      type: Number,
      default: 0
    },
    lastStudied: {
      type: Date
    }
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  generatedBy: {
    type: String,
    enum: ['user', 'ai'],
    default: 'ai'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Calculate progress before saving
studyPlanSchema.pre('save', function(next) {
  if (this.dailyTasks && this.dailyTasks.length > 0) {
    this.progress.totalTasks = this.dailyTasks.length;
    this.progress.completedTasks = this.dailyTasks.filter(task => task.completed).length;
    this.progress.completionPercentage = Math.round(
      (this.progress.completedTasks / this.progress.totalTasks) * 100
    );
  }
  next();
});

// Get today's tasks
studyPlanSchema.methods.getTodaysTasks = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.dailyTasks.filter(task => {
    const taskDate = new Date(task.date);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate.getTime() === today.getTime();
  });
};

// Get upcoming tasks
studyPlanSchema.methods.getUpcomingTasks = function(days = 7) {
  const today = new Date();
  const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
  
  return this.dailyTasks.filter(task => {
    const taskDate = new Date(task.date);
    return taskDate >= today && taskDate <= futureDate && !task.completed;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
};

export default mongoose.model('StudyPlan', studyPlanSchema);