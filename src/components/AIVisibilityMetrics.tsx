import React from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
) as unknown;

type ChartProps = {
  options: ChartOptions<'line'>;
  data: ChartData<'line'>;
};

interface AIVisibilityMetricsProps {
  metrics: {
    visibilityScore: number;
    competitorScores?: Record<string, number>;
    modelsMonitored?: number;
    topPerformingModel?: string;
    results: any[];
  };
  companyName: string;
  competitors: Array<{ name: string; website?: string }>;
  // Direct access to aiVisibility data for correct display
  aiVisibility?: {
    geoScore: number;
    brandMentions: number;
    competitorMentions: number;
    overallPresence: number;
    dailyMetrics: any[];
  };
}

export default function AIVisibilityMetrics({
  metrics,
  aiVisibility
}: AIVisibilityMetricsProps) {
  // Calculate total mentions for distribution
  const totalBrandMentions = aiVisibility?.brandMentions || 0;
  const totalCompetitorMentions = aiVisibility?.competitorMentions || 0;
  const totalMentions = totalBrandMentions + totalCompetitorMentions;
  
  // Calculate percentages for distribution
  const brandMentionPercentage = totalMentions > 0 
    ? Math.round((totalBrandMentions / totalMentions) * 100) 
    : 0;
  const competitorMentionPercentage = totalMentions > 0 
    ? Math.round((totalCompetitorMentions / totalMentions) * 100)
    : 0;

  // Get daily metrics for the chart
  const dailyMetrics = aiVisibility?.dailyMetrics || [];
  const sortedMetrics = [...dailyMetrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const chartData = {
    labels: sortedMetrics.map(metric => new Date(metric.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Overall Presence',
        data: sortedMetrics.map(metric => metric.overallPresence),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4,
        borderWidth: 2
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'AI Visibility Over Time'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Overall Presence (%)'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        },
        grid: {
          display: false
        }
      }
    }
  }

  // Use the direct aiVisibility values if provided, otherwise fall back to the metrics object
  const geoScore = aiVisibility?.geoScore || metrics.visibilityScore;
  const brandMentions = aiVisibility?.brandMentions || 0;
  const competitorMentions = aiVisibility?.competitorMentions || 0;
  const overallPresence = aiVisibility?.overallPresence || metrics.visibilityScore;

  return (
    <div className="space-y-6">
      {/* Main Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Overall Score</h3>
          <div className="mt-2 flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{geoScore.toFixed(1)}%</p>
            <p className="ml-2 text-sm text-gray-500">weighted visibility score</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Brand Mentions</h3>
          <div className="mt-2 flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{brandMentions}</p>
            <p className="ml-2 text-sm text-gray-500">total mentions</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Competitor Mentions</h3>
          <div className="mt-2 flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{competitorMentions}</p>
            <p className="ml-2 text-sm text-gray-500">total mentions</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Overall Presence</h3>
          <div className="mt-2 flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{overallPresence.toFixed(1)}%</p>
            <p className="ml-2 text-sm text-gray-500">visibility rate</p>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <Line options={chartOptions} data={chartData} />
      </div>

      {/* Distribution Bar */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Brand Mentions Distribution</h3>
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                BRAND MENTIONS
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-blue-600">
                {brandMentionPercentage}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
            <div
              style={{ width: `${brandMentionPercentage}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
            />
          </div>
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-200">
                COMPETITOR MENTIONS
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-red-600">
                {competitorMentionPercentage}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
            <div
              style={{ width: `${competitorMentionPercentage}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
} 