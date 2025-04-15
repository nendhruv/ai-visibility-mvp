'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useApp } from '@/context/AppContext'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function AuthRedirect() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { setCompanyData } = useApp()

  useEffect(() => {
    async function checkCompanyData() {
      if (!loading && user) {
        try {
          const response = await fetch('/api/company', {
            credentials: 'include',
          })
          
          if (response.ok) {
            const companyData = await response.json()
            setCompanyData(companyData)
            router.push('/dashboard')
          } else {
            router.push('/analyze')
          }
        } catch (error) {
          console.error('Failed to fetch company data:', error)
          router.push('/analyze')
        }
      } else if (!loading && !user) {
        // If user is not logged in, stay on landing page
        // The login/register buttons will handle navigation
      }
    }

    checkCompanyData()
  }, [loading, user, router, setCompanyData])

  // Only show loading spinner if user is authenticated but we're waiting on data
  if (loading || user) {
    return (
      <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Return null if not authenticated - show the landing page
  return null
} 