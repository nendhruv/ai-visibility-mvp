import { runChatGptVisibilityPrompt } from './openai';
import claudeClient from './claude';
import geminiClient from './gemini';
import { TrackingConfig, ModelResponse, TrackingResultData, AIModel } from '@/types';
import connectDB from './db';
import mongoose from 'mongoose';

// Define mongoose schemas and models
const AIModelSchema = new mongoose.Schema({
  name: String,
  provider: String,
  active: Boolean
});

const TrackingConfigSchema = new mongoose.Schema({
  companyId: String,
  prompt: String,
  promptType: String,
  active: Boolean,
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'weekly'
  },
  lastRun: Date,
  nextRun: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const TrackingResultSchema = new mongoose.Schema({
  trackingConfigId: String,
  timestamp: Date,
  results: Array,
  brandMentions: Number,
  overallPosition: Number,
  summary: String
});

// Models - defined with type assertion
const getModels = async () => {
  await connectDB();
  const AIModelModel = mongoose.models.AIModel || 
    mongoose.model('AIModel', AIModelSchema);
  
  const TrackingConfigModel = mongoose.models.TrackingConfig || 
    mongoose.model('TrackingConfig', TrackingConfigSchema);
  
  const TrackingResultModel = mongoose.models.TrackingResult || 
    mongoose.model('TrackingResult', TrackingResultSchema);
  
  return {
    AIModel: AIModelModel,
    TrackingConfig: TrackingConfigModel,
    TrackingResult: TrackingResultModel
  };
};

/**
 * Service for managing AI visibility tracking
 */
export class AITrackingService {
  /**
   * Gets all supported AI models
   */
  async getSupportedModels(): Promise<AIModel[]> {
    const { AIModel } = await getModels();
    const models = await AIModel.find({ active: true }).lean();
    
    // If no models exist yet in the database, create default ones
    if (models.length === 0) {
      const defaultModels = [
        { name: 'ChatGPT', provider: 'OpenAI', active: true },
        { name: 'Claude', provider: 'Anthropic', active: true },
        { name: 'Gemini', provider: 'Google', active: true }
      ];
      
      await AIModel.insertMany(defaultModels);
      return await AIModel.find({ active: true }).lean();
    }
    
    return models;
  }

  /**
   * Runs a prompt against all active AI models
   */
  async runPromptAcrossModels(
    config: TrackingConfig, 
    company: { name: string; brandIdentifiers: string[] },
    competitors: Array<{ name: string }>
  ): Promise<TrackingResultData> {
    const models = await this.getSupportedModels();
    const results: ModelResponse[] = [];
    
    // Run each model with a slight delay to avoid rate limits
    for (const model of models) {
      try {
        const response = await this.runPromptOnModel(model.name, config.prompt);
        
        // Analyze the response
        const brandVisible = this.determineBrandVisibility(
          response, 
          company.name, 
          company.brandIdentifiers
        );
        
        const competitorMentions = this.extractCompetitorMentions(
          response,
          competitors
        );
        
        const position = brandVisible 
          ? this.determineBrandPosition(response, company.name, competitors.map(c => c.name)) 
          : null;
        
        const sentiment = this.analyzeSentiment(response, company.name);
        
        results.push({
          model: model.name,
          response,
          brandVisible,
          position,
          competitors: competitorMentions,
          sentiment
        });
        
        // Pause between API calls
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`Error running prompt on ${model.name}:`, error);
        // Add an error result
        results.push({
          model: model.name,
          response: `Error: ${error.message}`,
          brandVisible: false,
          position: null,
          competitors: [],
          sentiment: 'neutral'
        });
      }
    }
    
    // Calculate overall metrics
    const brandMentions = results.filter(r => r.brandVisible).length;
    
    // Get previous result for change calculation
    const { TrackingResult } = await getModels();
    const previousResult = await TrackingResult.findOne({ 
      trackingConfigId: config.id,
      _id: { $ne: config.id } // Exclude current one
    }).sort({ createdAt: -1 }).lean();
    
    let brandMentionsChange;
    if (previousResult && typeof previousResult.brandMentions === 'number') {
      const previous = previousResult.brandMentions;
      if (previous > 0) {
        brandMentionsChange = Math.round(((brandMentions - previous) / previous) * 100);
      }
    }
    
    // Calculate overall position
    const positions = results
      .filter(r => r.position !== null)
      .map(r => r.position) as number[];
    
    const overallPosition = positions.length > 0
      ? Math.round(positions.reduce((sum, pos) => sum + pos, 0) / positions.length)
      : null;
    
    // Generate summary
    const summary = this.generateResultSummary(results, company.name);
    
    return {
      id: `result-${Date.now()}`,
      trackingConfigId: config.id,
      timestamp: new Date(),
      results,
      brandMentions,
      brandMentionsChange,
      overallPosition,
      summary
    };
  }
  
  /**
   * Run a prompt on a specific AI model
   */
  private async runPromptOnModel(model: string, prompt: string): Promise<string> {
    switch (model) {
      case 'ChatGPT':
        return runChatGptVisibilityPrompt(prompt);
      case 'Claude':
        return claudeClient.runVisibilityPrompt(prompt);
      case 'Gemini':
        return geminiClient.runVisibilityPrompt(prompt);
      default:
        throw new Error(`Unsupported model: ${model}`);
    }
  }
  
  /**
   * Determines if the brand is visible in the response
   */
  private determineBrandVisibility(
    response: string, 
    brandName: string, 
    brandIdentifiers: string[]
  ): boolean {
    // Normalize text for case-insensitive matching
    const normalizedResponse = response.toLowerCase();
    const normalizedBrand = brandName.toLowerCase();
    const normalizedIdentifiers = brandIdentifiers.map(id => id.toLowerCase());
    
    // Direct brand mention
    if (normalizedResponse.includes(normalizedBrand)) {
      return true;
    }
    
    // Check brand identifiers
    for (const identifier of normalizedIdentifiers) {
      if (normalizedResponse.includes(identifier)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Extracts competitor mentions from the response
   */
  private extractCompetitorMentions(
    response: string,
    competitors: Array<{ name: string }>
  ): Array<{ name: string; position: number }> {
    const normalizedResponse = response.toLowerCase();
    const mentions: Array<{ name: string; position: number }> = [];
    
    for (const competitor of competitors) {
      const normalizedName = competitor.name.toLowerCase();
      const position = normalizedResponse.indexOf(normalizedName);
      
      if (position !== -1) {
        mentions.push({
          name: competitor.name,
          position
        });
      }
    }
    
    // Sort by position in the text
    return mentions.sort((a, b) => a.position - b.position);
  }
  
  /**
   * Determines the brand's position in the list of mentions
   */
  private determineBrandPosition(
    response: string, 
    brandName: string, 
    competitorNames: string[]
  ): number | null {
    // Extract all company mentions in order
    const allCompanies = [...competitorNames, brandName];
    const mentions: Array<{ company: string; position: number }> = [];
    
    for (const company of allCompanies) {
      const position = response.toLowerCase().indexOf(company.toLowerCase());
      if (position !== -1) {
        mentions.push({ company, position });
      }
    }
    
    // Sort by position in the text
    mentions.sort((a, b) => a.position - b.position);
    
    // Find the brand's position
    const brandIndex = mentions.findIndex(mention => 
      mention.company.toLowerCase() === brandName.toLowerCase()
    );
    
    // Return position (1-indexed) or null if not found
    return brandIndex !== -1 ? brandIndex + 1 : null;
  }
  
  /**
   * Analyze sentiment of brand mentions in the response
   */
  private analyzeSentiment(response: string, brandName: string): 'positive' | 'neutral' | 'negative' {
    const normalizedResponse = response.toLowerCase();
    const normalizedBrand = brandName.toLowerCase();
    
    // Find the brand name in the response
    const brandIndex = normalizedResponse.indexOf(normalizedBrand);
    if (brandIndex === -1) {
      return 'neutral';
    }
    
    // Extract a window of text around the brand mention
    const startIndex = Math.max(0, brandIndex - 100);
    const endIndex = Math.min(normalizedResponse.length, brandIndex + 100);
    const contextWindow = normalizedResponse.substring(startIndex, endIndex);
    
    // Simple sentiment analysis based on positive and negative words
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'outstanding', 'best', 'leading', 
      'top', 'recommended', 'innovative', 'reliable', 'trusted', 'quality'
    ];
    
    const negativeWords = [
      'bad', 'poor', 'terrible', 'worst', 'avoid', 'disappointing', 'unreliable',
      'expensive', 'difficult', 'problematic', 'issue', 'complaint'
    ];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    // Count positive and negative words
    for (const word of positiveWords) {
      const regex = new RegExp('\\b' + word + '\\b', 'gi');
      const matches = contextWindow.match(regex);
      if (matches) {
        positiveCount += matches.length;
      }
    }
    
    for (const word of negativeWords) {
      const regex = new RegExp('\\b' + word + '\\b', 'gi');
      const matches = contextWindow.match(regex);
      if (matches) {
        negativeCount += matches.length;
      }
    }
    
    // Determine sentiment
    if (positiveCount > negativeCount) {
      return 'positive';
    } else if (negativeCount > positiveCount) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }
  
  /**
   * Generate a summary of the tracking results
   */
  private generateResultSummary(
    results: ModelResponse[], 
    brandName: string
  ): string {
    const totalModels = results.length;
    const visibleCount = results.filter(r => r.brandVisible).length;
    const visibilityPercentage = Math.round((visibleCount / totalModels) * 100);
    
    const visibleModels = results
      .filter(r => r.brandVisible)
      .map(r => r.model)
      .join(', ');
    
    if (visibleCount === 0) {
      return `${brandName} was not mentioned by any of the ${totalModels} AI models for this prompt.`;
    }
    
    if (visibleCount === totalModels) {
      return `${brandName} was mentioned by all ${totalModels} AI models: ${visibleModels}.`;
    }
    
    return `${brandName} was mentioned by ${visibleCount} of ${totalModels} AI models (${visibilityPercentage}%): ${visibleModels}.`;
  }
  
  /**
   * Calculate the next run time based on frequency
   */
  calculateNextRunTime(frequency: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    const nextRun = new Date(now);
    
    switch (frequency) {
      case 'daily':
        // Next day at 9 AM
        nextRun.setDate(now.getDate() + 1);
        nextRun.setHours(9, 0, 0, 0);
        break;
      case 'weekly':
        // Next Monday at 9 AM
        nextRun.setDate(now.getDate() + (7 - now.getDay() + 1) % 7);
        nextRun.setHours(9, 0, 0, 0);
        break;
      case 'monthly':
        // First day of next month at 9 AM
        nextRun.setMonth(now.getMonth() + 1);
        nextRun.setDate(1);
        nextRun.setHours(9, 0, 0, 0);
        break;
    }
    
    return nextRun;
  }
  
  /**
   * Store tracking result in the database
   */
  async storeTrackingResult(result: TrackingResultData): Promise<void> {
    const { TrackingResult, TrackingConfig } = await getModels();
    
    await TrackingResult.create({
      _id: result.id,
      trackingConfigId: result.trackingConfigId,
      timestamp: result.timestamp,
      results: result.results,
      brandMentions: result.brandMentions,
      overallPosition: result.overallPosition,
      summary: result.summary
    });
    
    // Get frequency for the tracking config
    const config = await TrackingConfig.findById(result.trackingConfigId).lean();
    const frequency = config?.frequency || 'weekly';
    
    // Update the tracking config with the last run time
    await TrackingConfig.findByIdAndUpdate(result.trackingConfigId, {
      lastRun: result.timestamp,
      nextRun: this.calculateNextRunTime(frequency),
      updatedAt: new Date()
    });
  }
}

// Export a singleton instance
const aiTrackingService = new AITrackingService();
export default aiTrackingService; 