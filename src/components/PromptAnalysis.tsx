import React, { useState, useMemo, useEffect } from 'react'

interface PromptResponse {
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
}

interface PromptAnalysisProps {
  responses: PromptResponse[];
  industryPrompts: Array<{
    query: string;
    intent: string;
    volume: string;
  }>;
  showPosition?: boolean;
  showLastScanned?: boolean;
}

export default function PromptAnalysis({ 
  responses, 
  industryPrompts,
  showPosition = true,
  showLastScanned = true
}: PromptAnalysisProps) {
  console.log("PromptAnalysis rendering");
  
  // First calculate default scanTimes to use in state initialization
  // This ensures we ALWAYS have a default tab selected
  const today = new Date().toISOString();
  
  // IMPORTANT: Initialize with first tab selected by default
  // Using today's date ensures there's always a value
  const [selectedScanTime, setSelectedScanTime] = useState(today);
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');

  // Group responses by scan time
  const groupResponsesByScanTime = (responses: PromptResponse[]) => {
    const groups: Record<string, PromptResponse[]> = {};
    
    // Sort responses by scan time in descending order
    const sortedResponses = [...responses].sort((a, b) => 
      new Date(b.scanTime || 0).getTime() - new Date(a.scanTime || 0).getTime()
    );

    // Group responses that are within 3 minutes of each other
    sortedResponses.forEach(response => {
      const scanTime = new Date(response.scanTime || 0);
      const scanTimeStr = scanTime.toISOString();
      
      // Find an existing group that's within 3 minutes
      const existingGroupKey = Object.keys(groups).find(key => {
        const groupTime = new Date(key);
        const timeDiff = Math.abs(scanTime.getTime() - groupTime.getTime());
        return timeDiff <= 3 * 60 * 1000; // 3 minutes in milliseconds
      });

      if (existingGroupKey) {
        // Add to existing group
        groups[existingGroupKey].push(response);
      } else {
        // Create new group
        groups[scanTimeStr] = [response];
      }
    });

    return groups;
  };

  // Get unique scan times for tabs
  const scanTimes = useMemo(() => {
    // Always include today as a fallback option
    const today = new Date();
    const todayStr = today.toISOString();
    
    let result;
    
    // If there are no responses, just return today
    if (responses.length === 0) {
      const next6Days = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i + 1);
        return date.toISOString();
      });
      result = [todayStr, ...next6Days];
    } else {
      // Group existing responses by scan time
      const groups = groupResponsesByScanTime(responses);
      const sortedTimes = Object.keys(groups).sort((a, b) => 
        new Date(b).getTime() - new Date(a).getTime()
      );
      
      // Get the latest scan time and upcoming dates
      const latestScanTime = sortedTimes[0] || todayStr;
      const next6Days = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i + 1);
        return date.toISOString();
      });
      
      result = [latestScanTime, ...next6Days];
    }
    
    // Force update the selected tab if necessary
    setTimeout(() => {
      if (result.length > 0 && (!selectedScanTime || !result.includes(selectedScanTime))) {
        setSelectedScanTime(result[0]);
      }
    }, 0);
    
    return result;
  }, [responses, selectedScanTime]);

  // Always force select the first tab if none is selected
  useEffect(() => {
    // Force selection of the first tab regardless of current state
    if (scanTimes.length > 0) {
      setSelectedScanTime(scanTimes[0]);
    }
  }, [scanTimes]); // Only depend on scanTimes to ensure it runs when data changes

  // Use layout effect to ensure selection happens before the browser paints
  React.useLayoutEffect(() => {
    console.log("Layout effect running, selectedScanTime:", selectedScanTime);
    if (scanTimes.length > 0) {
      console.log("Setting scan time to:", scanTimes[0]);
      setSelectedScanTime(scanTimes[0]);
    }
  }, [scanTimes]); // Run this effect whenever scanTimes changes

  const scanTimeGroups = groupResponsesByScanTime(responses);

  // Get responses for the selected scan time
  const getResponsesForSelectedTime = () => {
    console.log("Getting responses for time:", selectedScanTime);
    console.log("Current filters - Model:", selectedModel, "Prompt:", selectedPrompt, "Sentiment:", selectedSentiment);
    console.log("Available industry prompts:", industryPrompts.map(p => p.query));
    
    if (!selectedScanTime) {
      return [];
    }
    const groups = groupResponsesByScanTime(responses);
    let scanTimeResponses = groups[selectedScanTime] || [];
    
    // If no scan time responses exist but we have responses, show all responses
    if (scanTimeResponses.length === 0 && responses.length > 0) {
      console.log("No responses for this scan time, showing all responses");
      scanTimeResponses = responses;
    }
    
    // Apply filters to the responses
    return scanTimeResponses.filter(response => {
      // Filter by model
      if (selectedModel !== 'all' && response.model !== selectedModel) {
        return false;
      }
      
      // Filter by prompt - only apply if a prompt is actually selected
      if (selectedPrompt && response.prompt !== selectedPrompt) {
        return false;
      }
      
      // Filter by sentiment
      if (selectedSentiment !== 'all' && response.sentiment !== selectedSentiment) {
        return false;
      }
      
      return true;
    });
  };

  // Get the count of responses for a scan time
  const getResponseCount = (timeStr: string) => {
    if (!timeStr) {
      return 0;
    }
    const groups = groupResponsesByScanTime(responses);
    const scanTimeResponses = groups[timeStr] || [];
    
    // Apply the same filters as getResponsesForSelectedTime
    const filteredResponses = scanTimeResponses.filter(response => {
      if (selectedModel !== 'all' && response.model !== selectedModel) {
        return false;
      }
      if (selectedPrompt && response.prompt !== selectedPrompt) {
        return false;
      }
      if (selectedSentiment !== 'all' && response.sentiment !== selectedSentiment) {
        return false;
      }
      return true;
    });
    
    return filteredResponses.length;
  };

  const models = ['ChatGPT', 'Gemini', 'Claude']
  const sentiments = ['positive', 'neutral', 'negative']
  
  const formatTimeAgo = (date?: Date) => {
    if (!date) return '';
    
    const now = new Date();
    const scanTime = new Date(date);
    const diffMs = now.getTime() - scanTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMins > 0) {
      return `${diffMins}m ago`;
    } else {
      return 'Just now';
    }
  };

  // Function to get adjusted position (add +1 to index)
  const getAdjustedPosition = (position?: string) => {
    if (!position || position === 'Not Mentioned' || isNaN(parseInt(position))) {
      return 'Not Ranked';
    }
    const positionNumber = parseInt(position);
    return (positionNumber + 1).toString();
  };

  // Function to render model icon
  const renderModelIcon = (model: string) => {
    switch (model) {
      case 'ChatGPT':
        return (
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="#10A37F">
              <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
            </svg>
            ChatGPT
          </span>
        );
      case 'Claude':
        return (
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="#7C41DA">
              <path d="M20 12a8 8 0 01-8 8 8 8 0 01-8-8 8 8 0 018-8 8 8 0 018 8z" />
              <path fill="white" d="M10.5 7.5v3h-3v3h3v3h3v-3h3v-3h-3v-3z" />
            </svg>
            Claude
          </span>
        );
      case 'Gemini':
        return (
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="#8E75B2">
              <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 3.311L17.311 9 12 12.689 6.689 9 12 5.311zM6 15.5V9.25l6 3.75v6.25l-6-3.75zm12 0l-6 3.75v-6.25l6-3.75v6.25z" />
            </svg>
            Gemini
          </span>
        );
      default:
        return <span>{model}</span>;
    }
  };

  // Helper function to get sentiment badge color
  const getSentimentBadgeColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      case 'neutral':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format scan time for display
  const formatScanTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  // Check if a scan time is in the future
  const isFutureScanTime = (timeStr: string) => {
    const scanDate = new Date(timeStr);
    const now = new Date();
    return scanDate > now;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-5 rounded-lg shadow border border-gray-200 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Model</label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-3 pr-10 py-2 appearance-none"
              >
                <option value="all">All Models</option>
                {models.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Prompt</label>
            <div className="relative">
              <select
                value={selectedPrompt || ''}
                onChange={(e) => {
                  console.log("Prompt changed to:", e.target.value);
                  setSelectedPrompt(e.target.value || null);
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-3 pr-10 py-2 appearance-none"
                defaultValue=""
              >
                <option value="">All Prompts</option>
                {industryPrompts.map(prompt => (
                  <option key={prompt.query} value={prompt.query}>{prompt.query}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Sentiment</label>
            <div className="relative">
              <select
                value={selectedSentiment}
                onChange={(e) => setSelectedSentiment(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-3 pr-10 py-2 appearance-none"
              >
                <option value="all">All Sentiments</option>
                {sentiments.map(sentiment => (
                  <option key={sentiment} value={sentiment}>
                    {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Time-based tabs */}
      <div className="border-b border-gray-200 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Scan Time</h3>
        <nav className="-mb-px flex space-x-6 overflow-x-auto pb-1">
          {scanTimes.map((timeStr, index) => {
            const isFuture = isFutureScanTime(timeStr);
            const isSelected = selectedScanTime === timeStr;
            const responseCount = getResponseCount(timeStr);

            return (
              <button
                key={timeStr}
                onClick={() => !isFuture && setSelectedScanTime(timeStr)}
                className={`${
                  isSelected
                    ? 'border-blue-500 text-blue-600 border-b-2 !important'
                    : isFuture
                    ? 'border-transparent text-gray-400 cursor-not-allowed'
                    : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center`}
                disabled={isFuture}
                style={isSelected ? { borderBottomWidth: '2px', borderBottomColor: '#3b82f6' } : {}}
              >
                <span className="mr-2">{formatScanTime(timeStr)}</span>
                {!isFuture && (
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    {responseCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* Results Table */}
      <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead>
            <tr className="bg-gray-50">
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[22%] border-b border-gray-200">
                Prompt
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[13%] border-b border-gray-200">
                Platform
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[13%] border-b border-gray-200">
                Visibility
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[13%] border-b border-gray-200">
                Sentiment
              </th>
              {showPosition && (
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[13%] border-b border-gray-200">
                  Position
                </th>
              )}
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[13%] border-b border-gray-200">
                Mentions
              </th>
              {showLastScanned && (
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[13%] border-b border-gray-200">
                  Last Scanned
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getResponsesForSelectedTime().map((response: PromptResponse, index: number) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-5 text-sm font-medium text-gray-900">
                  <div className="break-words max-h-20 overflow-y-auto" title={response.prompt}>
                    {response.prompt}
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-gray-600">
                  {renderModelIcon(response.model)}
                </td>
                <td className="px-6 py-5 text-sm text-gray-600">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    response.brandMentioned 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {response.brandMentioned ? 'Visible' : 'Not Visible'}
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-gray-600">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    response.sentiment === 'positive' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : response.sentiment === 'negative'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-gray-50 text-gray-700 border border-gray-200'
                  }`}>
                    {response.sentiment.charAt(0).toUpperCase() + response.sentiment.slice(1)}
                  </span>
                </td>
                {showPosition && (
                  <td className="px-6 py-5 text-sm text-gray-600">
                    {getAdjustedPosition(response.position)}
                  </td>
                )}
                <td className="px-6 py-5 text-sm text-gray-600">
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(response.competitorsMentioned) && response.competitorsMentioned.length > 0
                      ? response.competitorsMentioned.map((competitor: string, idx: number) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {competitor}
                          </span>
                        ))
                      : typeof response.competitorsMentioned === 'object' && response.competitorsMentioned
                      ? Object.entries(response.competitorsMentioned).map(([competitor, count], idx: number) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {competitor} ({typeof count === 'number' ? count : 0})
                          </span>
                        ))
                      : <span className="text-gray-400">-</span>}
                  </div>
                </td>
                {showLastScanned && (
                  <td className="px-6 py-5 text-sm text-gray-600 whitespace-nowrap">
                    {response.scanTime 
                      ? new Date(response.scanTime).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : new Date(response.date).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                  </td>
                )}
              </tr>
            ))}
            {getResponsesForSelectedTime().length === 0 && (
              <tr>
                <td colSpan={showPosition && showLastScanned ? 7 : showPosition || showLastScanned ? 6 : 5} className="px-6 py-12 text-center text-sm text-gray-500 bg-gray-50">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 13a4 4 0 100-8 4 4 0 000 8z" />
                    </svg>
                    <div className="text-center">
                      <p className="text-base font-medium text-gray-600 mb-1">No data available</p>
                      <p className="text-sm text-gray-500 mb-4">There are no visibility reports available for this time period.</p>
                      {responses.length === 0 && (
                        <p className="text-sm text-gray-600">
                          Try running a visibility scan to see how your brand appears in AI responses.
                        </p>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
} 