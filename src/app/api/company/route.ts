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

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    const companyData = await request.json()

    // Check if company already exists for this user
    const existingCompany = await Company.findOne({ userId: decoded.userId })
    
    if (existingCompany) {
      // Update existing company
      Object.assign(existingCompany, companyData)
      await existingCompany.save()
      return NextResponse.json(existingCompany)
    }

    // Create new company
    const company = new Company({
      ...companyData,
      userId: decoded.userId
    })
    
    await company.save()
    return NextResponse.json(company)
  } catch (error) {
    console.error('Company save error:', error)
    return NextResponse.json(
      { error: 'Failed to save company data' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    await connectDB()
    const token = cookies().get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    const company = await Company.findOne({ userId: decoded.userId })
    
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json(company)
  } catch (error) {
    console.error('Company fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company data' },
      { status: 500 }
    )
  }
} 