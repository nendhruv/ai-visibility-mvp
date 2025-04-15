import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import connectDB from '@/lib/db'
import { Company } from '@/models/Company'
import { JWT_SECRET } from '@/lib/config'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    await connectDB()
    const token = cookies().get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET!) as unknown as { userId: string }
    const { competitors } = await request.json()

    const company = await Company.findOne({ userId: decoded.userId })
    
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    company.competitors = competitors
    await company.save()

    return NextResponse.json(company)
  } catch (error) {
    console.error('Company competitors update error:', error)
    return NextResponse.json(
      { error: 'Failed to update company competitors' },
      { status: 500 }
    )
  }
} 