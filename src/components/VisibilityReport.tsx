'use client'

import { useState, useEffect } from 'react'
import LoadingSpinner from './LoadingSpinner'

interface VisibilityReportProps {
  url: string
}

interface ReportData {
  perception: {
    description: string
    industry: string
    keyProducts: string[]
  }
  chatGPT: {
    question: string
    answer: string
  }
}

export default function VisibilityReport({ url }: VisibilityReportProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)

  const fetchReport = async () => {
    try {
      const response = await fetch('/api/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      if (!response.ok) {
        throw new Error('Failed to generate visibility report')
      }

      const data = await response.json()
      setReportData(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [url])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  if (!reportData) return null

  return (
    <div className="space-y-8 text-gray-200">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">AI Visibility Report</h1>
        <p className="text-gray-400">
          See how your website performs on generative engines such as ChatGPT and Perplexity.
        </p>
      </div>

      <div className="text-xl text-white">{url}</div>

      {/* AI Perception Section */}
      <div className="bg-[#1a1d24] rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white mb-4">AI Perception</h2>
        <p className="text-gray-300">{reportData.perception.description}</p>
        
        {/* <div className="space-y-2">
          <p>
            <span className="text-gray-400">Industry:</span>{' '}
            <span className="text-gray-200">{reportData.perception.industry}</span>
          </p>
          
          <div>
            <p className="text-gray-400 mb-2">Key Products:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-200">
              {reportData.perception.keyProducts.map((product, index) => (
                <li key={index}>{product}</li>
              ))}
            </ul>
          </div>
        </div> */}
      </div>

      {/* ChatGPT Section */}
      <div className="bg-[#1a1d24] rounded-lg overflow-hidden">
        <div className="flex items-center space-x-3 p-4 border-b border-gray-700">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" 
            alt="ChatGPT" 
            className="h-6 w-6"
          />
          <span className="text-white font-medium">ChatGPT</span>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-[#2a2e37] rounded p-4">
            <p className="text-gray-300">{reportData.chatGPT.question}</p>
          </div>
          
          <div className="bg-[#2a2e37] rounded p-4">
            <p className="text-gray-300">{reportData.chatGPT.answer}</p>
          </div>
        </div>
      </div>
    </div>
  )
} 