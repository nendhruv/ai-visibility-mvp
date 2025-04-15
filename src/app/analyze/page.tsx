'use client'

import React, { useState } from 'react'
import { CompanyData, Competitor } from '@/types'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useApp } from '@/context/AppContext'
import Toast from '@/components/Toast'
import { store } from '@/lib/store'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import FullScreenLoader from '@/components/FullScreenLoader'

export default function AnalyzePage() {
  const { setCompanyData } = useApp()
  const { setHasAnalyzed, logout } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<CompanyData | null>(null)
  const [competitors, setCompetitors] = useState<Competitor[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const domain = formData.get('domain') as string
    const brand = formData.get('brand') as string

    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ domain, brand }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to crawl website')
      }

      const data = await response.json()
      
      // Store company data in database
      const saveResponse = await fetch('/api/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!saveResponse.ok) {
        throw new Error('Failed to save company data')
      }

      setResult(data)
      setCompanyData(data)
      setHasAnalyzed(true)
      setCurrentStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchCompetitors = async () => {
    if (!result) return
    
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ companyData: result }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch competitors')
      }
      
      const data = await response.json()
      setCompetitors(data.competitors)
      
      // Update the company data with competitors
      const updatedData = {
        ...result,
        competitors: data.competitors
      }
      setCompanyData(updatedData)
      
      // Update company with competitors in database
      const updateResponse = await fetch('/api/company/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ competitors: data.competitors }),
      })

      if (!updateResponse.ok) {
        throw new Error('Failed to update company competitors')
      }

      store.setCompetitors(data.competitors)
      setCurrentStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoToDashboard = async () => {
    try {
      setIsGenerating(true)
      
      if (!result || !result.industryPrompts || result.industryPrompts.length === 0) {
        throw new Error('No industry prompts available');
      }
      
      // Get all responses from all industry prompts
      const allResponses = [];
      
      // Process each prompt sequentially
      for (const industryPrompt of result.industryPrompts) {
        try {
          const response = await fetch('/api/generate-response', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              prompt: industryPrompt.query,
              model: "all", // Use all models
              industry: result.industry,
              brand: result.brand,
              competitors: result.competitors || []
            }),
          });
          
          if (!response.ok) {
            console.error(`Failed to generate response for prompt: ${industryPrompt.query}`);
            continue; // Skip this prompt but continue with others
          }
          
          const data = await response.json();
          
          // Handle multiple model responses
          if (data.allModels && data.results) {
            // Add all model responses for this prompt
            const modelResponses = data.results.map((modelResult: any) => ({
              prompt: industryPrompt.query,
              response: modelResult.response,
              model: modelResult.model,
              timestamp: new Date().toISOString(),
              promptIntent: industryPrompt.intent,
              promptVolume: industryPrompt.volume
            }));
            
            allResponses.push(...modelResponses);
          } else if (data.response) {
            // Handle single model response (fallback)
            allResponses.push({
              prompt: industryPrompt.query,
              response: data.response,
              model: data.model || 'Unknown',
              timestamp: new Date().toISOString(),
              promptIntent: industryPrompt.intent,
              promptVolume: industryPrompt.volume
            });
          }
        } catch (promptError) {
          console.error(`Error processing prompt ${industryPrompt.query}:`, promptError);
          // Continue with other prompts even if one fails
        }
      }
      
      if (allResponses.length === 0) {
        throw new Error('Failed to generate any responses');
      }
      
      // Update the company data with all generated responses
      const updatedData = {
        ...result,
        generatedResponses: allResponses
      };
      
      setCompanyData(updatedData);
      
      // Save the updated company data with responses
      try {
        // First save the general company data
        const saveResponse = await fetch('/api/company', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updatedData),
        });
        
        if (!saveResponse.ok) {
          console.warn('Failed to save company data to database');
        }

        // Then save the metric data calculated from the responses
        const metricsResponse = await fetch('/api/store-metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            responses: allResponses,
            metrics: {}, // Calculations will be done on the server
            brand: result.brand,
            competitors: result.competitors || []
          }),
        });

        if (!metricsResponse.ok) {
          console.warn('Failed to save metrics to database');
        } else {
        }
      } catch (saveError) {
        console.error('Error saving responses:', saveError);
      }
      
      // Set hasAnalyzed flag in auth context
      setHasAnalyzed(true)

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error:', error)
      setToast({
        message: 'Failed to prepare dashboard. Please try again.',
        type: 'error'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Company Information</h2>
              <p className="text-sm text-gray-500 mt-0.5">Enter your company details to begin analysis</p>
            </div>
            <form onSubmit={handleSubmit} className="p-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="domain" className="block text-sm font-medium text-gray-700">Website Domain</label>
                  <input
                    type="url"
                    name="domain"
                    id="domain"
                    required
                    placeholder="https://example.com"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="brand" className="block text-sm font-medium text-gray-700">Brand Name</label>
                  <input
                    type="text"
                    name="brand"
                    id="brand"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Analyze Website
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )

      case 2:
        return result && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium">Analysis Results</h2>
                <p className="text-sm text-gray-500 mt-0.5">Review your company analysis</p>
              </div>
              <div className="p-4 space-y-4">
                <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Company Description
                  </h3>
                  <p className="text-sm text-gray-700">{result.companyDescription}</p>
                </div>
                <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Industry
                  </h3>
                  <p className="text-sm text-gray-700">{result.industry}</p>
                </div>
                <button
                  onClick={fetchCompetitors}
                  disabled={loading}
                  className="w-full inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Check Competitors
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )

      case 3:
        return competitors && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Competitor Analysis</h2>
              <p className="text-sm text-gray-500 mt-0.5">Review identified competitors</p>
            </div>
            <div className="p-4 space-y-4">
              {competitors.map((competitor, index) => (
                <div key={index} className="bg-gray-50 rounded-md p-3 border border-gray-200">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {competitor.name}
                  </h3>
                  <p className="text-sm text-gray-700">{competitor.reasoning}</p>
                </div>
              ))}
              <button
                onClick={() => setCurrentStep(4)}
                className="w-full inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View Industry Prompts
              </button>
            </div>
          </div>
        )

      case 4:
        return result && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Industry Prompts</h2>
              <p className="text-sm text-gray-500 mt-0.5">Review identified prompts for your industry</p>
            </div>
            <div className="p-4 space-y-4">
              {result.industryPrompts.map((prompt, index) => (
                <div key={index} className="bg-gray-50 rounded-md p-3 border border-gray-200">
                  <h3 className="text-sm font-medium mb-2">{prompt.query}</h3>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {prompt.intent}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      {prompt.volume}
                    </span>
                  </div>
                </div>
              ))}
              <button
                onClick={handleGoToDashboard}
                disabled={isGenerating}
                className={`w-full inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 ${
                  isGenerating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Preparing your dashboard...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Go to Dashboard
                  </>
                )}
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Full Screen Loader */}
      <FullScreenLoader isLoading={isGenerating} />
      
      {/* Left Sidebar */}
      <div className="w-60 border-r border-gray-200 h-full flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              M
            </div>
            <span className="text-base font-semibold">MarketIntel AI</span>
          </div>
          <span className="text-xs text-gray-500 block mt-0.5">Setup your account</span>
        </div>

        {/* Steps Navigation */}
        <nav className="flex-1 py-2">
          <div className="space-y-0.5">
            <div className="mb-6">
              <div className="px-3 mb-1 text-xs font-medium text-gray-500 uppercase">Setup Steps</div>
              <button 
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  currentStep === 1 ? 'text-gray-900 bg-gray-50' : 'text-gray-600'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Company Details</span>
              </button>
              <button 
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  currentStep === 2 ? 'text-gray-900 bg-gray-50' : 'text-gray-600'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Analysis Results</span>
              </button>
              <button 
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  currentStep === 3 ? 'text-gray-900 bg-gray-50' : 'text-gray-600'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Competitors</span>
              </button>
              <button 
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  currentStep === 4 ? 'text-gray-900 bg-gray-50' : 'text-gray-600'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Industry Prompts</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Sign Out Button */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={logout}
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
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm font-medium">Setup Progress</span>
                </div>
                <span className="text-sm text-gray-500">{currentStep}/4</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-2 bg-blue-500 rounded-full transition-all duration-300" 
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                ></div>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            )}

            {renderStep()}

            {toast && (
              <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 