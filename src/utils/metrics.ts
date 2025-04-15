import { CompanyData, TrackingResults } from '@/types'

interface MetricsCalculation {
  geoScore: number;
  brandMentions: number;
  competitorMentions: number;
  overallPresence: number;
  dailyMetrics: Array<{
    date: Date;
    brandMentionRate: number;
    competitorMentionRate: number;
    overallPresence: number;
  }>;
  modelsMonitored: number;
  topPerformingModel: string;
}

export function calculateMetrics(companyData: CompanyData): MetricsCalculation {
  const promptResponses = companyData.aiVisibility?.promptResponses || [];
  const competitors = companyData.competitors || [];

  // For debugging
  console.log(`Processing ${promptResponses.length} prompt responses for metrics calculation`);
  
  // Calculate daily metrics
  const dailyMetricsMap = new Map<string, {
    brandMentions: number;
    competitorMentions: number;
    totalResponses: number;
  }>();

  promptResponses.forEach(response => {
    const date = new Date(response.date).toISOString().split('T')[0];
    const current = dailyMetricsMap.get(date) || {
      brandMentions: 0,
      competitorMentions: 0,
      totalResponses: 0
    };

    current.brandMentions += response.brandMentioned ? 1 : 0;
    current.competitorMentions += response.competitorsMentioned.length;
    current.totalResponses += 1;

    dailyMetricsMap.set(date, current);
  });

  // Convert daily metrics map to array
  const dailyMetrics = Array.from(dailyMetricsMap.entries()).map(([date, metrics]) => ({
    date: new Date(date),
    brandMentionRate: metrics.totalResponses > 0 ? (metrics.brandMentions / metrics.totalResponses) * 100 : 0,
    competitorMentionRate: metrics.totalResponses > 0 ? (metrics.competitorMentions / metrics.totalResponses) * 100 : 0,
    overallPresence: metrics.totalResponses > 0 ? 
      ((metrics.brandMentions / metrics.totalResponses) * 100) : 0
  }));

  // Calculate overall metrics
  const totalResponses = promptResponses.length;
  
  const totalBrandMentions = promptResponses.filter(r => r.brandMentioned === true).length;
  console.log(`Total brand mentions: ${totalBrandMentions} out of ${totalResponses} responses`);
  
  // Calculate brand mention rate
  const brandMentionRate = totalResponses > 0 ? (totalBrandMentions / totalResponses) * 100 : 0;
  
  // Calculate total competitor mentions by counting each competitor mentioned in each response
  const totalCompetitorMentions = promptResponses.reduce((sum, r) => {
    return sum + (r.competitorsMentioned ? r.competitorsMentioned.length : 0);
  }, 0);
  
  console.log(`Total competitor mentions: ${totalCompetitorMentions}`);

  // Calculate GEO Score (weighted combination of brand mentions and sentiment)
  const sentimentScores = promptResponses.map(r => {
    switch (r.sentiment) {
      case 'positive': return 1;
      case 'neutral': return 0.5;
      case 'negative': return 0;
      default: return 0.5;
    }
  });

  const averageSentimentScore = sentimentScores.length > 0 
    ? sentimentScores.reduce((sum: number, score: number) => sum + score, 0) / sentimentScores.length
    : 0.5;
  
  // Use the calculation from your data: (Brand Mention Rate * 0.7) + (Sentiment Score * 100 * 0.3)
  const geoScore = (brandMentionRate * 0.7) + (averageSentimentScore * 100 * 0.3);
  console.log(`GEO Score calculation: (${brandMentionRate} * 0.7) + (${averageSentimentScore} * 100 * 0.3) = ${geoScore}`);

  // Calculate model performance metrics
  const modelSet = new Set<string>();
  const modelMentions: Record<string, number> = {};
  
  promptResponses.forEach(response => {
    modelSet.add(response.model);
    if (response.brandMentioned) {
      modelMentions[response.model] = (modelMentions[response.model] || 0) + 1;
    }
  });
  
  // Find the top performing model
  let topPerformingModel = 'None';
  let maxMentions = 0;
  
  Object.entries(modelMentions).forEach(([model, mentions]) => {
    if (mentions > maxMentions) {
      maxMentions = mentions;
      topPerformingModel = model;
    }
  });

  
  // Directly use the server-provided metrics if available
  if (companyData.aiVisibility?.geoScore !== undefined && 
      companyData.aiVisibility?.brandMentions !== undefined &&
      companyData.aiVisibility?.competitorMentions !== undefined &&
      companyData.aiVisibility?.overallPresence !== undefined) {
    
    console.log(`Using server metrics: GEO Score=${companyData.aiVisibility.geoScore}, Brand Mentions=${companyData.aiVisibility.brandMentions}, Competitor Mentions=${companyData.aiVisibility.competitorMentions}`);
    
    return {
      geoScore: companyData.aiVisibility.geoScore,
      brandMentions: companyData.aiVisibility.brandMentions,
      competitorMentions: companyData.aiVisibility.competitorMentions,
      overallPresence: companyData.aiVisibility.overallPresence,
      dailyMetrics: companyData.aiVisibility.dailyMetrics || dailyMetrics,
      modelsMonitored: modelSet.size,
      topPerformingModel: topPerformingModel
    };
  }

  console.log(`Calculated metrics: GEO Score=${Math.round(geoScore)}, Brand Mentions=${totalBrandMentions}, Competitor Mentions=${totalCompetitorMentions}`);
  
  return {
    geoScore: Math.round(geoScore),
    brandMentions: totalBrandMentions,
    competitorMentions: totalCompetitorMentions,
    overallPresence: Math.round(brandMentionRate),
    dailyMetrics: dailyMetrics.sort((a, b) => a.date.getTime() - b.date.getTime()),
    modelsMonitored: modelSet.size,
    topPerformingModel: topPerformingModel
  };
}

export function calculateCompetitorScores(companyData: CompanyData): Record<string, number> {
  const promptResponses = companyData.aiVisibility?.promptResponses || [];
  const competitors = companyData.competitors || [];

  const competitorMentions = new Map<string, number>();
  const totalResponses = promptResponses.length;

  // Count mentions for each competitor
  promptResponses.forEach(response => {
    response.competitorsMentioned.forEach(competitor => {
      competitorMentions.set(
        competitor,
        (competitorMentions.get(competitor) || 0) + 1
      );
    });
  });

  // Calculate scores
  const scores: Record<string, number> = {};
  competitors.forEach(competitor => {
    const mentions = competitorMentions.get(competitor.name) || 0;
    scores[competitor.name] = Math.round((mentions / totalResponses) * 100);
  });

  return scores;
}

export function generateTrackingResults(companyData: CompanyData): TrackingResults {
  const metrics = calculateMetrics(companyData);
  const competitorScores = calculateCompetitorScores(companyData);

  return {
    results: companyData.aiVisibility?.promptResponses.map(response => ({
      prompt: response.prompt,
      response: response.response,
      brandMentions: response.brandMentioned ? 1 : 0,
      competitorMentions: response.competitorsMentioned.reduce((acc, comp) => {
        acc[comp] = 1;
        return acc;
      }, {} as Record<string, number>),
      sentiment: response.sentiment,
      promptIntent: 'High Intent', // This should come from the prompt data
      promptVolume: 'High Volume',  // This should come from the prompt data
      position: response.position,
      scanTime: response.scanTime || response.date
    })) || [],
    visibilityScore: metrics.geoScore,
    competitorScores,
    modelsMonitored: metrics.modelsMonitored,
    topPerformingModel: metrics.topPerformingModel
  };
} 