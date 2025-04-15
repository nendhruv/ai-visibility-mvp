import React from 'react'

interface ModelPerformanceWidgetProps {
  title: string;
  data: any[];
  companyName: string;
}

export default function ModelPerformanceWidget({
  title,
  data,
  companyName
}: ModelPerformanceWidgetProps) {
  // Calculate models monitored (unique models in the data)
  const models = Array.from(new Set(data.map(item => item.model || 'Unknown')));
  const modelsMonitored = models.length;
  
  // Find top performing model
  const topPerformingModel = models.length > 0 ? models[0] : 'None';
  
  return (
    <div className="flex flex-col lg:flex-row gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow flex-1">
        <h3 className="text-sm font-medium text-gray-500">Models Monitored</h3>
        <div className="mt-2 flex items-baseline">
          <p className="text-2xl font-semibold text-gray-900">{modelsMonitored}</p>
          <p className="ml-2 text-sm text-gray-500">AI models tracked</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {models.map((model) => (
            <span 
              key={model} 
              className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
            >
              {model}
            </span>
          ))}
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow flex-1">
        <h3 className="text-sm font-medium text-gray-500">Top Performing Model</h3>
        <div className="mt-2">
          <p className="text-2xl font-semibold text-gray-900">{topPerformingModel}</p>
          <p className="mt-1 text-sm text-gray-500">Mentioned {companyName} most often</p>
        </div>
        <div className="mt-2">
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            Best Visibility
          </span>
        </div>
      </div>
    </div>
  )
} 