'use client'

import { useState, useEffect } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import ResultCard from '@/components/ResultCard'

interface PromptsResponse {
  prompts: string[];
}

export default function PromptsPage() {
  const [loading, setLoading] = useState(false)
  const [prompts, setPrompts] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchPrompts = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to fetch prompts')
      const data: PromptsResponse = await response.json()
      setPrompts(data.prompts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrompts()
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Customer Search Prompts</h1>

      {loading && <LoadingSpinner />}
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {prompts && (
        <ResultCard title="Generated Prompts">
          <div className="space-y-4">
            {prompts.map((prompt, index) => (
              <div 
                key={index}
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <p className="text-gray-700">{prompt}</p>
              </div>
            ))}
          </div>
        </ResultCard>
      )}
    </div>
  )
} 