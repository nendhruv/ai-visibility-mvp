'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { CompanyData, Competitor, TrackingResults, TrackingResult } from '@/types'
import AIVisibilityMetrics from '@/components/AIVisibilityMetrics'
import PromptAnalysis from '@/components/PromptAnalysis'
import { generateTrackingResults } from '@/utils/metrics'
import Toast from '@/components/Toast'
import Link from 'next/link'

export default function Dashboard() {
  const router = useRouter()
  const { companyData, setCompanyData } = useApp()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isDemoData, setIsDemoData] = useState(true)
  const [oldTrackingResults, setOldTrackingResults] = useState<TrackingResults>({
    results: [],
    visibilityScore: 0,
    competitorScores: {},
    modelsMonitored: 0,
    topPerformingModel: ''
  })
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [autoScanPrompts, setAutoScanPrompts] = useState<string[]>([])

  // Fetch industry prompts on component mount
  useEffect(() => {
    const fetchIndustryPrompts = async () => {
      try {
        // First check if we have industry prompts in companyData
        if (companyData?.industryPrompts && companyData.industryPrompts.length > 0) {
       
          // Extract just the query field from each prompt object
          setAutoScanPrompts(companyData.industryPrompts.map(prompt => prompt.query));
          return;
        }
        
        // If not, fetch from API
        if (companyData?.industry) {
        
          const response = await fetch(`/api/industry-prompts?industry=${encodeURIComponent(companyData.industry)}`, {
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch industry prompts');
          }
          
          const data = await response.json();
          setAutoScanPrompts(data.prompts);
        }
      } catch (error) {
        console.error('Error fetching industry prompts:', error);
      }
    };

    fetchIndustryPrompts();
  }, [companyData?.industry, companyData?.industryPrompts]);

  // Load company data on component mount
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!companyData) {
        try {
       
          // Try to fetch company data from the API
          const response = await fetch('/api/company', {
            credentials: 'include'
          })
          
          if (!response.ok) {
         
            router.push('/analyze')
            return
          }
          
          const data = await response.json()
       
          
          setCompanyData(data)
          
          // If we have company data, use it directly
          setCompetitors(data.competitors || [])
          
          // If aiVisibility exists, use it as tracking results
          if (data.aiVisibility && data.aiVisibility.promptResponses && data.aiVisibility.promptResponses.length > 0) {
         
            // Use the aiVisibility data from server
            const trackingResults = generateTrackingResults(data)
            setOldTrackingResults(trackingResults)
            setIsDemoData(false)
          } else {
            // If no tracking results exist, use empty results
        
            let results: TrackingResults = {
              results: [],
              visibilityScore: 0,
              competitorScores: {},
              modelsMonitored: 0,
              topPerformingModel: ''
            };
            
            setOldTrackingResults(results);
            setIsDemoData(true);
          }
       
        } catch (error) {
          console.error('Error loading company data:', error)
          router.push('/analyze')
          return
        }
      } else {
        // If we have company data in context, use it directly
        setCompetitors(companyData.competitors || [])
        
        // If aiVisibility exists, use it as tracking results
        if (companyData.aiVisibility && companyData.aiVisibility.promptResponses && companyData.aiVisibility.promptResponses.length > 0) {
          // Use the aiVisibility data from server
          const trackingResults = generateTrackingResults(companyData)
          setOldTrackingResults(trackingResults)
          setIsDemoData(false)
        } else {
          // If no tracking results exist, use empty results
          let results: TrackingResults = {
            results: [],
            visibilityScore: 0,
            competitorScores: {},
            modelsMonitored: 0,
            topPerformingModel: ''
          };
          
          setOldTrackingResults(results);
          setIsDemoData(true);
        }
      }
      
      setLoading(false)
    }

    loadCompanyData()
  }, [companyData, router, setCompanyData])

  // Check if we have recent metric updates from database
  useEffect(() => {
    if (companyData?.aiVisibility?.promptResponses && companyData.aiVisibility.promptResponses.length > 0) {
      // We're now using the aiVisibility data directly from the server
      setIsDemoData(false);
    }
  }, [companyData?.aiVisibility]);


  // Show loading spinner while data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="animate-pulse">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Setting Up Your Dashboard</h2>
            <p className="text-gray-600 mb-6">Please wait while we create your personalized AI visibility dashboard. This may take 2-3 minutes.</p>
          </div>
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
          </div>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-6">We're analyzing your data and preparing insights...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/login')
    return null
  }

  // Redirect to analyze page if no company data
  if (!companyData) {
    router.push('/analyze')
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-60 border-r border-gray-200 h-full flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              {companyData.brand ? companyData.brand.charAt(0).toUpperCase() : 'M'}
            </div>
            <span className="text-base font-semibold">{companyData.brand || 'Your Brand'}</span>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 py-2">
          <div className="space-y-0.5">
            <div className="mb-6">
              <div className="px-3 mb-1 text-xs font-medium text-gray-500 uppercase">Navigation</div>
              <Link 
                href="/dashboard"
                className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-900 bg-gray-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
                <span>AI Visibility Dashboard</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Sign Out Button */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => {
              // Add logout functionality here
              router.push('/login')
            }}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Toast 
          message={toastMessage?.message || ''} 
          type={toastMessage?.type || 'success'} 
          onClose={() => setToastMessage(null)} 
        />

        <div className="py-6 px-8">
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">AI Visibility Dashboard</h1>
          </header>

          <div className="space-y-8">
            {/* Visibility Metrics */}
            <AIVisibilityMetrics 
              metrics={oldTrackingResults}
              companyName={companyData.brand || 'Your Brand'}
              competitors={competitors}
              aiVisibility={companyData.aiVisibility}
            />


            {/* Response Analysis */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">AI Response Analysis</h2>
              <PromptAnalysis 
                responses={companyData.aiVisibility?.promptResponses || []} 
                industryPrompts={companyData.industryPrompts || []}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 