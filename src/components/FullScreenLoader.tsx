'use client'

import { useState, useEffect } from 'react'

interface FullScreenLoaderProps {
  isLoading: boolean;
  title?: string;
  subtitle?: string;
}

export default function FullScreenLoader({ 
  isLoading, 
  title = "Preparing Your Dashboard", 
  subtitle = "This might take 2-3 minutes" 
}: FullScreenLoaderProps) {
  const [loadingMessage, setLoadingMessage] = useState('Analyzing your industry data...');
  const [progressValue, setProgressValue] = useState(5);
  
  // Messages that will rotate during loading
  const loadingMessages = [
    "Analyzing your industry data...",
    "Gathering competitor insights...",
    "Processing AI visibility metrics...",
    "Generating intelligent responses...",
    "Calculating your brand's AI visibility score...",
    "Analyzing search engine results...",
    "Mapping your competitive landscape...",
    "Identifying key visibility opportunities...",
    "Preparing your personalized dashboard...",
    "Almost there! Finalizing your insights..."
  ];
  
  useEffect(() => {
    if (!isLoading) return;
    
    let messageIndex = 0;
    let progress = 5;
    
    // Change the message every 5 seconds
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[messageIndex]);
      
      // Increment progress but never reach 100%
      progress += 8;
      if (progress >= 95) progress = 94;
      setProgressValue(progress);
    }, 5000);
    
    // Cleanup
    return () => {
      clearInterval(messageInterval);
    };
  }, [isLoading]);
  
  if (!isLoading) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-white bg-opacity-95 flex flex-col items-center justify-center">
      <div className="max-w-md w-full mx-auto text-center p-6">
        <div className="w-24 h-24 mx-auto mb-8">
          <div className="w-24 h-24 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-8">{subtitle}</p>
        
        <div className="mb-6 relative pt-1">
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
            <div 
              style={{ width: `${progressValue}%` }} 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500 ease-in-out"
            ></div>
          </div>
          <p className="text-right text-sm text-gray-500">{progressValue}%</p>
        </div>
        
        <div className="h-12 mb-8">
          <p className="text-gray-700 animate-pulse">{loadingMessage}</p>
        </div>
        
        <div className="text-sm text-gray-500">
          <p>This process will analyze your data across multiple AI models</p>
          <p className="mt-1">Please don't close this page</p>
        </div>
      </div>
      
      {/* Visual elements to make it more engaging */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="text-blue-50">
          <path fill="currentColor" fillOpacity="1" d="M0,96L48,122.7C96,149,192,203,288,202.7C384,203,480,149,576,138.7C672,128,768,160,864,160C960,160,1056,128,1152,117.3C1248,107,1344,117,1392,122.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
    </div>
  )
} 