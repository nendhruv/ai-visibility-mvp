'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useApp } from '@/context/AppContext'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { companyData, setCompanyData } = useApp()

  useEffect(() => {
    async function checkCompanyData() {
      if (!loading && user) {
        try {
          const response = await fetch('/api/company', {
            credentials: 'include',
          })
          
          if (response.ok) {
            const data = await response.json()
            setCompanyData(data)
          } else {
            router.push('/analyze')
          }
        } catch (error) {
          console.error('Failed to fetch company data:', error)
          router.push('/analyze')
        }
      } else if (!loading && !user) {
        router.push('/login')
      }
    }

    checkCompanyData()
  }, [loading, user, router, setCompanyData])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !companyData) {
    return null // This will not render while redirecting
  }

  return <>{children}</>
} 