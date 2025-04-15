import React from 'react';
import { TrackingConfig, ModelResponse } from '@/types';

interface TrackingResultWithModel {
  id: string;
  brandMentions: number;
  brandMentionsChange?: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  results: ModelResponse[];
}

interface TrackingAndAnalysisTableProps {
  trackingConfigs: TrackingConfig[];
  results: TrackingResultWithModel[];
  onToggleTracking: (id: string, active: boolean) => void;
  onRunNow: (id: string) => void;
  onDelete: (id: string) => void;
  onViewDetails: (id: string, model: string) => void;
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatRelativeTime(date: Date | string | undefined): string {
  if (!date) return 'Never run';
  
  const now = new Date();
  const parsedDate = new Date(date);
  const diffMs = now.getTime() - parsedDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

const TrackingAndAnalysisTable: React.FC<TrackingAndAnalysisTableProps> = ({
  trackingConfigs,
  results,
  onToggleTracking,
  onRunNow,
  onDelete,
  onViewDetails
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Prompt
            </th>
            <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              AI Model
            </th>
            <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Brand Visibility
            </th>
            <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Position
            </th>
            <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
              Last Run
            </th>
            <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
              Frequency
            </th>
            <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {trackingConfigs.map((config) => {
            // Find corresponding results for this config
            const resultData = results.find(r => r.id === config.id);
            const modelResults = resultData?.results || [];
            
            return (
              <React.Fragment key={config.id}>
                {/* Show a row for each model result */}
                {modelResults.length > 0 ? (
                  modelResults.map((modelResult, idx) => (
                    <tr key={`${config.id}-${modelResult.model}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {idx === 0 ? (
                        // Show prompt only for first row of this config group
                        <td rowSpan={modelResults.length} className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                          <div className="max-w-xs truncate" title={config.prompt}>
                            {config.prompt}
                          </div>
                          <span className="text-xs text-gray-500">{config.promptType}</span>
                        </td>
                      ) : null}
                      
                      {idx === 0 ? (
                        // Show status only for first row
                        <td rowSpan={modelResults.length} className="px-3 py-4 whitespace-nowrap border-r border-gray-200">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            config.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {config.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      ) : null}
                      
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {modelResult.model}
                        </span>
                      </td>
                      
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          modelResult.brandVisible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {modelResult.brandVisible ? 'Visible' : 'Not Visible'}
                        </span>
                      </td>
                      
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {modelResult.position !== null ? (
                          <span className="font-medium">
                            {getOrdinal(modelResult.position)}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      
                      {idx === 0 ? (
                        // Show last run only for first row
                        <td rowSpan={modelResults.length} className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell border-r border-gray-200">
                          {formatRelativeTime(config.lastRun)}
                        </td>
                      ) : null}
                      
                      {idx === 0 ? (
                        // Show frequency only for first row
                        <td rowSpan={modelResults.length} className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell border-r border-gray-200">
                          {config.frequency.charAt(0).toUpperCase() + config.frequency.slice(1)}
                        </td>
                      ) : null}
                      
                      <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          onClick={() => onViewDetails(config.id, modelResult.model)}
                        >
                          View Details
                        </button>
                        
                        {idx === 0 && (
                          // Show these actions only for first row
                          <>
                            <button
                              className={`text-${config.active ? 'gray' : 'indigo'}-600 hover:text-${config.active ? 'gray' : 'indigo'}-900 mr-3`}
                              onClick={() => onToggleTracking(config.id, !config.active)}
                            >
                              {config.active ? 'Disable' : 'Enable'}
                            </button>
                            
                            <button
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                              onClick={() => onRunNow(config.id)}
                            >
                              Run Now
                            </button>
                            
                            <button
                              className="text-red-600 hover:text-red-900"
                              onClick={() => onDelete(config.id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  // No results available yet
                  <tr key={config.id}>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="max-w-xs truncate" title={config.prompt}>
                        {config.prompt}
                      </div>
                      <span className="text-xs text-gray-500">{config.promptType}</span>
                    </td>
                    
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        config.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {config.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500" colSpan={3}>
                      No data available yet
                    </td>
                    
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {formatRelativeTime(config.lastRun)}
                    </td>
                    
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                      {config.frequency.charAt(0).toUpperCase() + config.frequency.slice(1)}
                    </td>
                    
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        className={`text-${config.active ? 'gray' : 'indigo'}-600 hover:text-${config.active ? 'gray' : 'indigo'}-900 mr-3`}
                        onClick={() => onToggleTracking(config.id, !config.active)}
                      >
                        {config.active ? 'Disable' : 'Enable'}
                      </button>
                      
                      <button
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                        onClick={() => onRunNow(config.id)}
                      >
                        Run Now
                      </button>
                      
                      <button
                        className="text-red-600 hover:text-red-900"
                        onClick={() => onDelete(config.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TrackingAndAnalysisTable; 