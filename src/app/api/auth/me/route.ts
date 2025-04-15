import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import connectDB from '@/lib/db'
import { User } from '@/models/User'
import { Company } from '@/models/Company'
import { JWT_SECRET } from '@/lib/config'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const token = cookies().get('auth-token')?.value
    
    if (!token) {
      console.log('No auth-token cookie found')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let decoded;
    try {
      console.log('Attempting to verify token with JWT_SECRET')
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string, email: string }
      console.log('Token verification successful')
    } catch (error) {
      console.error('Token verification error details:', {
        error,
        tokenLength: token.length,
        secretLength: JWT_SECRET.length,
        secretFirstChar: JWT_SECRET.charAt(0),
        secretLastChar: JWT_SECRET.charAt(JWT_SECRET.length - 1)
      })
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    try {
      await connectDB()
      const user = await User.findById(decoded.userId).select('-password')
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 401 })
      }

      // Check if the user has company data (has analyzed)
      let hasAnalyzed = false
      try {
        const company = await Company.findOne({ userId: user._id })
        hasAnalyzed = !!company
      } catch (err) {
        console.error('Error checking company data:', err)
        // Default to false if there's an error
        hasAnalyzed = false
      }

      return NextResponse.json({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email
        },
        hasAnalyzed
      })
    } catch (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 