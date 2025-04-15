'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { CompanyData, Competitor, TrackingResults } from '@/types'

interface AppContextType {
  companyData: CompanyData | null;
  setCompanyData: (data: CompanyData | null) => void;
  competitors: Competitor[] | null;
  setCompetitors: (data: Competitor[] | null) => void;
  trackingResults: TrackingResults | null;
  setTrackingResults: (data: TrackingResults | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [competitors, setCompetitors] = useState<Competitor[] | null>(null)
  const [trackingResults, setTrackingResults] = useState<TrackingResults | null>(null)

  return (
    <AppContext.Provider value={{
      companyData,
      setCompanyData,
      competitors,
      setCompetitors,
      trackingResults,
      setTrackingResults,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
} 