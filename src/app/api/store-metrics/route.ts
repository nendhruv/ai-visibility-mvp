import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import { Company } from '@/models/Company';
import { JWT_SECRET } from '@/lib/config';

export const runtime = 'nodejs';

interface LLMResponse {
  prompt: string;
  response: string;
  model: string;
  timestamp: string;
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET!) as unknown as { userId: string };
    const { responses, metrics } = await request.json() as { 
      responses: LLMResponse[],
      metrics: Record<string, any>
    };

    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return NextResponse.json({ error: 'No responses provided' }, { status: 400 });
    }

    // Find company for this user
    const company = await Company.findOne({ userId: decoded.userId });
    
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Initialize aiVisibility if it doesn't exist
    if (!company.aiVisibility) {
      company.aiVisibility = {
        geoScore: 0,
        brandMentions: 0, 
        competitorMentions: 0,
        overallPresence: 0,
        promptResponses: [],
        dailyMetrics: []
      };
    }

    // Process each response and add to promptResponses
    const brandName = company.brand.toLowerCase();
    console.log('========== METRICS CALCULATION DEBUG ==========');
    console.log(`Brand being analyzed: ${company.brand}`);
    const competitorNames = (company.competitors || []).map((comp: any) => comp.name.toLowerCase());
    console.log(`Competitors being tracked: ${competitorNames.join(', ')}`);
    
    console.log('\n--- PROCESSING RESPONSES ---');
    const processedResponses = responses.map((response: LLMResponse, index: number) => {
      console.log(`\nResponse #${index + 1}:`);
      console.log(`Prompt: "${response.prompt}"`);
      console.log(`Model: ${response.model}`);
      
      const responseText = response.response.toLowerCase();
      const brandMentioned = responseText.includes(brandName);
      console.log(`Brand "${company.brand}" mentioned: ${brandMentioned}`);
      
      const position = brandMentioned ? responseText.indexOf(brandName) : -1;
      if (brandMentioned) {
        console.log(`Position in response: ${position} (character index)`);
      }
      
      // Find competitor mentions
      const competitorsMentioned = competitorNames.filter((compName: string) => 
        responseText.includes(compName)
      );
      
      if (competitorsMentioned.length > 0) {
        console.log(`Competitors mentioned: ${competitorsMentioned.join(', ')}`);
      } else {
        console.log('No competitors mentioned');
      }
      
      // Simple sentiment analysis
      const sentiment = analyzeSentiment(responseText, brandName);
      console.log(`Sentiment analysis: ${sentiment}`);
      
      return {
        date: new Date(),
        prompt: response.prompt,
        model: response.model,
        response: response.response,
        brandMentioned,
        competitorsMentioned,
        sentiment,
        position: position !== -1 ? position.toString() : 'Not Mentioned',
        scanTime: new Date()
      };
    });

    // Add new responses to existing ones
    company.aiVisibility.promptResponses = [
      ...company.aiVisibility.promptResponses,
      ...processedResponses
    ];

    // Calculate metrics
    const totalResponses = company.aiVisibility.promptResponses.length;
    console.log('\n--- METRICS CALCULATIONS ---');
    console.log(`Total responses analyzed: ${totalResponses}`);
    
    const brandMentions = company.aiVisibility.promptResponses.filter((r: any) => r.brandMentioned).length;
    console.log(`Total brand mentions: ${brandMentions}`);
    console.log(`Brand mention rate: ${totalResponses > 0 ? (brandMentions / totalResponses) * 100 : 0}%`);
    
    const competitorMentions = company.aiVisibility.promptResponses.reduce((sum: number, r: any) => sum + r.competitorsMentioned.length, 0);
    console.log(`Total competitor mentions: ${competitorMentions}`);
    
    // Calculate sentiment score (0-1 scale)
    const sentimentScores = company.aiVisibility.promptResponses.map((r: any) => {
      switch (r.sentiment) {
        case 'positive': return 1;
        case 'neutral': return 0.5;
        case 'negative': return 0;
        default: return 0.5;
      }
    });
    
    const averageSentiment = sentimentScores.reduce((sum: number, score: number) => sum + score, 0) / sentimentScores.length;
    console.log(`Average sentiment score: ${averageSentiment} (0-1 scale)`);
    
    // Calculate GEO score - weighted combination of brand mentions and sentiment
    const brandMentionRate = totalResponses > 0 ? (brandMentions / totalResponses) * 100 : 0;
    const geoScore = (brandMentionRate * 0.7) + (averageSentiment * 100 * 0.3);
    console.log('\n--- FINAL GEO SCORE CALCULATION ---');
    console.log(`GEO Score formula: (Brand Mention Rate * 0.7) + (Sentiment Score * 100 * 0.3)`);
    console.log(`GEO Score: (${brandMentionRate} * 0.7) + (${averageSentiment} * 100 * 0.3) = ${geoScore}`);
    
    // Update metrics
    company.aiVisibility.geoScore = Math.round(geoScore);
    company.aiVisibility.brandMentions = brandMentions;
    company.aiVisibility.competitorMentions = competitorMentions;
    
    const overallPresence = totalResponses > 0 
      ? ((brandMentions + competitorMentions) / (totalResponses * 2)) * 100 
      : 0;
    console.log(`Overall Presence: ${overallPresence}%`);
    company.aiVisibility.overallPresence = Math.round(overallPresence);
    
    console.log('========== END OF METRICS CALCULATION ==========');

    // Add daily metrics entry for today
    const today = new Date().toISOString().split('T')[0];
    
    // Check if we already have a metric for today
    const existingDailyMetricIndex = company.aiVisibility.dailyMetrics.findIndex(
      (metric: any) => new Date(metric.date).toISOString().split('T')[0] === today
    );

    const todaysResponses = company.aiVisibility.promptResponses.filter(
      (r: any) => new Date(r.date).toISOString().split('T')[0] === today
    );
    
    const todaysBrandMentions = todaysResponses.filter((r: any) => r.brandMentioned).length;
    const todaysCompetitorMentions = todaysResponses.reduce((sum: number, r: any) => sum + r.competitorsMentioned.length, 0);
    
    const dailyMetric = {
      date: new Date(),
      brandMentionRate: todaysResponses.length > 0 ? (todaysBrandMentions / todaysResponses.length) * 100 : 0,
      competitorMentionRate: todaysResponses.length > 0 ? (todaysCompetitorMentions / todaysResponses.length) * 100 : 0,
      overallPresence: todaysResponses.length > 0 
        ? ((todaysBrandMentions + todaysCompetitorMentions) / (todaysResponses.length * 2)) * 100
        : 0
    };

    if (existingDailyMetricIndex >= 0) {
      // Update existing metric
      company.aiVisibility.dailyMetrics[existingDailyMetricIndex] = dailyMetric;
    } else {
      // Add new metric
      company.aiVisibility.dailyMetrics.push(dailyMetric);
    }

    // Save to database
    await company.save();
    
    return NextResponse.json({
      success: true,
      message: 'Metrics stored successfully',
      totalResponses: company.aiVisibility.promptResponses.length,
      geoScore: company.aiVisibility.geoScore
    });
  } catch (error) {
    console.error('Error storing metrics:', error);
    return NextResponse.json(
      { error: 'Failed to store metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function for sentiment analysis
function analyzeSentiment(text: string, brandName: string): 'positive' | 'neutral' | 'negative' {
  if (!text.includes(brandName.toLowerCase())) {
    return 'neutral';
  }

  const positiveWords = [
    'great', 'excellent', 'good', 'best', 'top', 'leading', 'innovative', 
    'trusted', 'reliable', 'recommended', 'quality', 'superior'
  ];
  
  const negativeWords = [
    'bad', 'poor', 'worst', 'avoid', 'disappointing', 'expensive', 'overpriced',
    'unreliable', 'outdated', 'limited', 'problem', 'issue'
  ];

  // Find context around brand mention
  const brandIndex = text.indexOf(brandName.toLowerCase());
  const contextStart = Math.max(0, brandIndex - 150);
  const contextEnd = Math.min(text.length, brandIndex + 150);
  const context = text.substring(contextStart, contextEnd);

  // Count positive and negative words
  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = context.match(regex);
    if (matches) positiveCount += matches.length;
  });

  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = context.match(regex);
    if (matches) negativeCount += matches.length;
  });

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
} 