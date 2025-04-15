'use client'

import { createContext, useState, useContext, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { store } from '@/lib/store'

interface User {
  id: string
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  hasAnalyzed: boolean
  setHasAnalyzed: (value: boolean) => void
  login: (userData: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const router = useRouter()

  // Check for existing auth state on load
  useEffect(() => {
    let isMounted = true

    async function loadUserFromAPI() {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        })
        
        if (!isMounted) return

        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          setHasAnalyzed(data.hasAnalyzed || false)
        } else {
          // Clear any existing user data if not authenticated
          setUser(null)
          setHasAnalyzed(false)
        }
      } catch (error) {
        console.error('Failed to load user:', error)
        if (isMounted) {
          setUser(null)
          setHasAnalyzed(false)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    loadUserFromAPI()

    return () => {
      isMounted = false
    }
  }, [])

  const login = (userData: User) => {
    setUser(userData)
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      setUser(null)
      setHasAnalyzed(false)
      store.clearStore()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const value = {
    user,
    loading,
    hasAnalyzed,
    setHasAnalyzed,
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 