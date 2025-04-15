'use client'

import { useState, useEffect } from 'react'
import { Competitor } from '@/types'
import LoadingSpinner from '@/components/LoadingSpinner'
import ResultCard from '@/components/ResultCard'
import { useApp } from '@/context/AppContext'

export default function CompetitorsPage() {
  const { companyData } = useApp()
  const [loading, setLoading] = useState(false)
  const [competitors, setCompetitors] = useState<Competitor[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchCompetitors = async () => {
    if (!companyData) {
      setError('Please analyze a website first')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ companyData })
      })

      if (!response.ok) throw new Error('Failed to fetch competitors')
      const data = await response.json()
      setCompetitors(data.competitors)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompetitors()
  }, [companyData])

  if (!companyData) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">
            Please analyze a website first on the home page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {loading && <LoadingSpinner />}
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {competitors && (
        <div className="grid gap-6">
          {competitors.map((competitor, index) => (
            <ResultCard key={index} title={competitor.name}>
              <p className="text-gray-700">{competitor.reasoning}</p>
            </ResultCard>
          ))}
        </div>
      )}
    </div>
  )
} 