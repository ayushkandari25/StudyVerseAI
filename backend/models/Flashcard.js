import mongoose from 'mongoose';

const flashcardSchema = new mongoose.Schema({
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
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    minlength: [5, 'Question must be at least 5 characters long']
  },
  answer: {
    type: String,
    required: [true, 'Answer is required'],
    trim: true,
    minlength: [1, 'Answer must be at least 1 character long']
  },
  topic: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  tags: [{
    type: String,
    trim: true
  }],
  stats: {
    timesReviewed: {
      type: Number,
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    incorrectAnswers: {
      type: Number,
      default: 0
    },
    lastReviewed: {
      type: Date
    },
    averageResponseTime: {
      type: Number, // in seconds
      default: 0
    }
  },
  reviewData: {
    interval: {
      type: Number, // in days
      default: 1
    },
    easeFactor: {
      type: Number,
      default: 2.5
    },
    nextReview: {
      type: Date,
      default: Date.now
    },
    reviewCount: {
      type: Number,
      default: 0
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

// Calculate success rate
flashcardSchema.virtual('successRate').get(function() {
  if (this.stats.timesReviewed === 0) return 0;
  return Math.round((this.stats.correctAnswers / this.stats.timesReviewed) * 100);
});

// Check if card is due for review
flashcardSchema.virtual('isDue').get(function() {
  return new Date() >= this.reviewData.nextReview;
});

// Update review data (spaced repetition algorithm)
flashcardSchema.methods.updateReviewData = function(quality) {
  // quality: 0-5 (0 = wrong, 5 = perfect)
  this.stats.timesReviewed += 1;
  this.stats.lastReviewed = new Date();
  this.reviewData.reviewCount += 1;
  
  if (quality >= 3) {
    this.stats.correctAnswers += 1;
    
    if (this.reviewData.reviewCount === 1) {
      this.reviewData.interval = 1;
    } else if (this.reviewData.reviewCount === 2) {
      this.reviewData.interval = 6;
    } else {
      this.reviewData.interval = Math.round(this.reviewData.interval * this.reviewData.easeFactor);
    }
    
    this.reviewData.easeFactor = this.reviewData.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else {
    this.stats.incorrectAnswers += 1;
    this.reviewData.reviewCount = 0;
    this.reviewData.interval = 1;
  }
  
  if (this.reviewData.easeFactor < 1.3) {
    this.reviewData.easeFactor = 1.3;
  }
  
  this.reviewData.nextReview = new Date(Date.now() + this.reviewData.interval * 24 * 60 * 60 * 1000);
  
  return this.save();
};

// Ensure virtual fields are included in JSON
flashcardSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Flashcard', flashcardSchema);