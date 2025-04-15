import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import connectDB from '@/lib/db'
import { User } from '@/models/User'
import { store } from '@/lib/store'
import { JWT_SECRET } from '@/lib/config'
import { Company } from '@/models/Company'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    await connectDB()

    const { email, password } = await request.json()

    // Find user by email
    const user = await User.findOne({ email })
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create JWT token - ensure JWT_SECRET is definitely a string
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      JWT_SECRET as string,
      { expiresIn: '7d' }
    )

    // Check if user has analyzed (has company data)
    // Try to find company data for this user instead of relying on in-memory store
    let hasAnalyzed = false
    try {
      const company = await Company.findOne({ userId: user._id })
      hasAnalyzed = !!company
    } catch (err) {
      console.error('Error checking company data:', err)
      // Default to false if there's an error
      hasAnalyzed = false
    }

    // Create the response
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
      hasAnalyzed,
    })

    // Set cookie in the response
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_URL?.startsWith('https'),
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
} 