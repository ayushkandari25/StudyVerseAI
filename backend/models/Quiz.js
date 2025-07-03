import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
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
    required: [true, 'Quiz title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  questions: [{
    question: {
      type: String,
      required: true,
      trim: true
    },
    options: [{
      type: String,
      required: true,
      trim: true
    }],
    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
      max: 3
    },
    explanation: {
      type: String,
      trim: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    topic: {
      type: String,
      required: true,
      trim: true
    },
    points: {
      type: Number,
      default: 1
    }
  }],
  settings: {
    timeLimit: {
      type: Number, // in minutes
      default: 30
    },
    showCorrectAnswers: {
      type: Boolean,
      default: true
    },
    randomizeQuestions: {
      type: Boolean,
      default: false
    },
    randomizeOptions: {
      type: Boolean,
      default: false
    },
    allowRetake: {
      type: Boolean,
      default: true
    }
  },
  attempts: [{
    attemptNumber: {
      type: Number,
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date
    },
    answers: [{
      questionIndex: {
        type: Number,
        required: true
      },
      selectedAnswer: {
        type: Number,
        required: true
      },
      isCorrect: {
        type: Boolean,
        required: true
      },
      timeSpent: {
        type: Number // in seconds
      }
    }],
    score: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      required: true
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    }
  }],
  stats: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    bestScore: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    lastAttempt: {
      type: Date
    }
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Calculate quiz statistics before saving
quizSchema.pre('save', function(next) {
  if (this.attempts && this.attempts.length > 0) {
    this.stats.totalAttempts = this.attempts.length;
    this.stats.bestScore = Math.max(...this.attempts.map(attempt => attempt.percentage));
    this.stats.averageScore = Math.round(
      this.attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / this.attempts.length
    );
    this.stats.lastAttempt = this.attempts[this.attempts.length - 1].endTime;
  }
  next();
});

// Get quiz performance analytics
quizSchema.methods.getPerformanceAnalytics = function() {
  if (!this.attempts || this.attempts.length === 0) {
    return null;
  }
  
  const completedAttempts = this.attempts.filter(attempt => attempt.completed);
  
  return {
    totalAttempts: completedAttempts.length,
    bestScore: Math.max(...completedAttempts.map(attempt => attempt.percentage)),
    averageScore: Math.round(
      completedAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / completedAttempts.length
    ),
    improvement: completedAttempts.length > 1 ? 
      completedAttempts[completedAttempts.length - 1].percentage - completedAttempts[0].percentage : 0,
    topicPerformance: this.getTopicPerformance(),
    timeAnalytics: this.getTimeAnalytics()
  };
};

// Get performance by topic
quizSchema.methods.getTopicPerformance = function() {
  if (!this.attempts || this.attempts.length === 0) return {};
  
  const topicStats = {};
  
  this.questions.forEach((question, index) => {
    if (!topicStats[question.topic]) {
      topicStats[question.topic] = {
        total: 0,
        correct: 0,
        percentage: 0
      };
    }
    
    topicStats[question.topic].total += this.attempts.length;
    
    this.attempts.forEach(attempt => {
      if (attempt.answers[index] && attempt.answers[index].isCorrect) {
        topicStats[question.topic].correct += 1;
      }
    });
    
    topicStats[question.topic].percentage = Math.round(
      (topicStats[question.topic].correct / topicStats[question.topic].total) * 100
    );
  });
  
  return topicStats;
};

// Get time analytics
quizSchema.methods.getTimeAnalytics = function() {
  if (!this.attempts || this.attempts.length === 0) return null;
  
  const completedAttempts = this.attempts.filter(attempt => attempt.completed);
  
  if (completedAttempts.length === 0) return null;
  
  const durations = completedAttempts.map(attempt => {
    return (new Date(attempt.endTime) - new Date(attempt.startTime)) / 1000 / 60; // in minutes
  });
  
  return {
    averageTime: Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length),
    bestTime: Math.min(...durations),
    worstTime: Math.max(...durations)
  };
};

export default mongoose.model('Quiz', quizSchema);