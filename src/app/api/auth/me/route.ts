import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import connectDB from '@/lib/db'
import { User } from '@/models/User'
import { store } from '@/lib/store'
import { JWT_SECRET } from '@/lib/config'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const token = cookies().get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string, email: string }
    } catch (error) {
      console.error('Token verification error:', error)
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    try {
      await connectDB()
      const user = await User.findById(decoded.userId).select('-password')
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 401 })
      }

      // Check if the user has company data (has analyzed)
      const hasAnalyzed = store.getCompanyData() !== null

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