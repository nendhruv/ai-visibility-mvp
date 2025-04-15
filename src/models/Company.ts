import mongoose from 'mongoose'

export interface ICompany extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  domain: string;
  brand: string;
  rawText?: string;
  textLength?: number;
  companyDescription: string;
  industry: string;
  industryPrompts: Array<{
    query: string;
    intent: string;
    volume: string;
  }>;
  competitors: Array<{
    name: string;
    reasoning: string;
  }>;
  aiVisibility: {
    geoScore: number;
    brandMentions: number;
    competitorMentions: number;
    overallPresence: number;
    promptResponses: Array<{
      date: Date;
      prompt: string;
      model: 'ChatGPT' | 'Perplexity' | 'Gemini' | 'Claude';
      response: string;
      brandMentioned: boolean;
      competitorsMentioned: string[];
      sentiment: 'positive' | 'neutral' | 'negative';
      marketPosition: string;
      position?: string;
      scanTime?: Date;
      relevanceScore?: number;
    }>;
    dailyMetrics: Array<{
      date: Date;
      brandMentionRate: number;
      competitorMentionRate: number;
      overallPresence: number;
    }>;
    trackingSchedule?: {
      isEnabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      lastRun?: Date;
      nextRun?: Date;
      targetUrl?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  domain: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: true
  },
  rawText: String,
  textLength: Number,
  companyDescription: {
    type: String,
    required: true
  },
  industry: {
    type: String,
    required: true
  },
  industryPrompts: [{
    query: String,
    intent: String,
    volume: String
  }],
  competitors: [{
    name: String,
    reasoning: String
  }],
  aiVisibility: {
    geoScore: {
      type: Number,
      default: 0
    },
    brandMentions: {
      type: Number,
      default: 0
    },
    competitorMentions: {
      type: Number,
      default: 0
    },
    overallPresence: {
      type: Number,
      default: 0
    },
    promptResponses: [{
      date: {
        type: Date,
        required: true
      },
      prompt: {
        type: String,
        required: true
      },
      model: {
        type: String,
        enum: ['ChatGPT', 'Perplexity', 'Gemini', 'Claude'],
        required: true
      },
      response: {
        type: String,
        required: true
      },
      brandMentioned: {
        type: Boolean,
        default: false
      },
      competitorsMentioned: [String],
      sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative'],
        default: 'neutral'
      },
      marketPosition: String,
      position: {
        type: String,
        default: 'Not Ranked'
      },
      scanTime: {
        type: Date,
        default: Date.now
      },
      relevanceScore: {
        type: Number,
        default: 0
      }
    }],
    dailyMetrics: [{
      date: {
        type: Date,
        required: true
      },
      brandMentionRate: {
        type: Number,
        required: true
      },
      competitorMentionRate: {
        type: Number,
        required: true
      },
      overallPresence: {
        type: Number,
        required: true
      }
    }],
    trackingSchedule: {
      isEnabled: {
        type: Boolean,
        default: false
      },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'weekly'
      },
      lastRun: Date,
      nextRun: Date,
      targetUrl: String
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Update the updatedAt timestamp before saving
companySchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

export const Company = mongoose.models.Company || mongoose.model<ICompany>('Company', companySchema) 