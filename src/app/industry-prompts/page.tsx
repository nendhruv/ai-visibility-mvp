'use client'

import { useState } from 'react'
import { IndustryPrompt } from '@/types'
import LoadingSpinner from '@/components/LoadingSpinner'
import ResultCard from '@/components/ResultCard'
import { useRouter } from 'next/navigation'
import FullScreenLoader from '@/components/FullScreenLoader'

export default function IndustryPromptsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false)
  const [prompts, setPrompts] = useState<IndustryPrompt[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDashboardGenerating, setIsDashboardGenerating] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const industry = formData.get('industry') as string

    try {
      const response = await fetch('/api/industryPrompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry }),
      })

      if (!response.ok) throw new Error('Failed to generate industry prompts')
      const data = await response.json()
      setPrompts(data.prompts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoToDashboard = async () => {
    setIsDashboardGenerating(true);
    // Simulate time needed to prepare dashboard
    // In a real application, this would be actual processing time
    try {
      // Send the user to the dashboard after a timeout
      // In a real app, you would actually process the data here
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      setError('Failed to prepare dashboard');
      setIsDashboardGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Full Screen Loader for dashboard preparation */}
      <FullScreenLoader isLoading={isDashboardGenerating} />

      <h1 className="text-2xl font-bold mb-6">Industry Search Prompts</h1>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="mb-4">
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
            Industry
          </label>
          <input
            type="text"
            name="industry"
            id="industry"
            required
            placeholder="e.g., online gift hamper services"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {loading ? 'Generating...' : 'Generate Prompts'}
        </button>
      </form>

      {loading && <LoadingSpinner />}
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {prompts && (
        <ResultCard title="Industry-Specific Prompts">
          <div className="space-y-6">
            {prompts.map((prompt, index) => (
              <div key={index} className="border-b pb-4 last:border-b-0">
                <p className="font-medium mb-2">{prompt.query}</p>
                <div className="flex gap-4">
                  <span className={`text-sm px-2 py-1 rounded ${
                    prompt.intent.includes('High') ? 'bg-green-100' :
                    prompt.intent.includes('Medium') ? 'bg-yellow-100' :
                    'bg-blue-100'
                  }`}>
                    {prompt.intent}
                  </span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    prompt.volume.includes('High') ? 'bg-green-100' :
                    prompt.volume.includes('Medium') ? 'bg-yellow-100' :
                    'bg-blue-100'
                  }`}>
                    {prompt.volume}
                  </span>
                </div>
              </div>
            ))}
            
            <button
              onClick={handleGoToDashboard}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
            >
              Go to Dashboard
            </button>
          </div>
        </ResultCard>
      )}
    </div>
  )
} 