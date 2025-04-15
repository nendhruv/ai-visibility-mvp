import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimiter } from './lib/rateLimiter'
import * as jose from 'jose'
import { JWT_SECRET } from '@/lib/config'

// Paths that don't require authentication
const publicPaths = ['/', '/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/me']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get the request origin
  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_URL || '*'
  
  // Set CORS headers for API routes
  const response = NextResponse.next()
  
  if (pathname.startsWith('/api')) {
    // Add CORS headers for API routes
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return response
    }
  }
  
  // Get IP address from request for rate limiting
  const ip = request.ip || 'anonymous'

  // Check if path starts with /api for rate limiting
  if (pathname.startsWith('/api')) {
    // Determine which rate limit to use based on the endpoint
    let rateLimitPath = 'default'
    if (pathname.startsWith('/api/generate-response')) {
      rateLimitPath = 'generate'
    }

    if (!rateLimiter.canMakeRequest(ip, rateLimitPath)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
  }

  // Skip auth check for public paths
  if (publicPaths.includes(pathname)) {
    return response
  }

  // Check for auth token
  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    // If accessing API, return JSON error
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    // For page routes, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // Create secret key for jose
    const secret = new TextEncoder().encode(JWT_SECRET)
    // Verify JWT token
    await jose.jwtVerify(token, secret)
    return response
  } catch (error) {
    console.error('Token verification error:', error)
    // If accessing API, return JSON error
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    // For page routes, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|favicon.ico).*)']
} 