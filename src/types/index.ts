export interface CompanyData {
  domain: string;
  brand: string;
  rawText: string;
  textLength?: number;
  companyDescription: string;
  industry: string;
  industryPrompts: Array<{
    query: string;
    intent: string;
    volume: string;
  }>;
  competitors?: Array<{
    name: string;
    reasoning: string;
  }>;
  generatedResponses?: Array<{
    prompt: string;
    response: string;
    model: string;
    timestamp: string;
  }>;
  aiVisibility?: {
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
  success?: boolean;
}

export interface IndustryPrompt {
  query: string;
  intent: 'Discovery' | 'High Intent' | 'Medium Intent' | 'Low Intent';
  volume: 'Low Volume' | 'Medium Volume' | 'High Volume';
}

export interface Competitor {
  name: string;
  reasoning: string;
}

export interface TrackingResult {
  prompt: string;
  response: string;
  brandMentions: number;
  competitorMentions?: number | Record<string, number>;
  competitorsMentioned?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  promptIntent?: string;
  promptVolume?: string;
  position?: string | number;
  scanTime?: Date;
  date?: string;
  model?: string;
}

export interface TrackingResults {
  results: TrackingResult[];
  visibilityScore: number;
  competitorScores?: Record<string, number>;
  modelsMonitored?: number;
  topPerformingModel?: string;
}

export interface DailyMetric {
  date: Date;
  brandMentionRate: number;
  competitorMentionRate: number;
  overallPresence: number;
}

export interface PromptResponse {
  date: Date;
  prompt: string;
  model: string;
  response: string;
  brandMentioned: boolean;
  competitorsMentioned: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  marketPosition: 'Leader' | 'Challenger' | 'Not Mentioned';
  relevanceScore: number;
  position?: string;
  scanTime?: Date;
}

export interface AIVisibility {
  geoScore: number;
  brandMentions: number;
  competitorMentions: number;
  overallPresence: number;
  promptResponses: PromptResponse[];
  dailyMetrics: DailyMetric[];
  trackingSchedule?: {
    isEnabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    lastRun?: Date;
    nextRun?: Date;
    targetUrl?: string;
  };
}

export interface TrackingSchedule {
  isEnabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  lastRun?: Date;
  nextRun?: Date;
  targetUrl?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  active: boolean;
}

export interface TrackingConfig {
  id: string;
  companyId: string;
  prompt: string;
  promptType: string;
  active: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelResponse {
  model: string;
  response: string;
  brandVisible: boolean;
  position: number | null;
  competitors: Array<{
    name: string;
    position: number;
  }>;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface TrackingResultData {
  id: string;
  trackingConfigId: string;
  timestamp: Date;
  results: ModelResponse[];
  brandMentions: number;
  brandMentionsChange?: number;
  overallPosition: number | null;
  summary: string;
}

export interface ExtendedTrackingResult extends TrackingResult {
  id: string;
  active: boolean;
  platformName: string;
  promptType: string;
  lastRun: string;
  frequency: string;
}

export interface PlatformTrackingResult {
  id: string;
  platformName: string;
  prompt: string;
  promptType: string;
  active: boolean;
  brandVisible: boolean;
  position: number | string;
  lastRun: string;
  frequency: string;
  nextRun?: string;
  response: string;
  competitors: Array<{ name: string; position: number }>;
} 