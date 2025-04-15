import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

// Define industry prompts
const industryPrompts = {
  'Technology': [
    'What are the leading companies in artificial intelligence?',
    'Who are the top cloud computing providers?',
    'Which companies are leading in cybersecurity?'
  ],
  'Finance': [
    'What are the top fintech companies?',
    'Which banks have the best digital services?',
    'Who are the leading payment processors?'
  ],
  'Healthcare': [
    'Which companies are leading in digital health?',
    'What are the top healthcare technology providers?',
    'Who are the major players in telemedicine?'
  ],
  'Retail': [
    'What are the top e-commerce platforms?',
    'Which retailers have the best omnichannel presence?',
    'Who are the leading fashion retailers?'
  ],
  'default': [
    'Who are the market leaders in this industry?',
    'What companies are driving innovation in this space?',
    'Which brands have the strongest market presence?'
  ]
}

export async function GET(request: Request) {
  try {
    // Get user from JWT token
    const token = cookies().get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    // Get industry from query params
    const { searchParams } = new URL(request.url)
    const industry = searchParams.get('industry')

    // Return prompts based on industry
    const prompts = industry && industryPrompts[industry as keyof typeof industryPrompts]
      ? industryPrompts[industry as keyof typeof industryPrompts]
      : industryPrompts.default

    return NextResponse.json({ prompts })
  } catch (error) {
    console.error('Error fetching industry prompts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch industry prompts' },
      { status: 500 }
    )
  }
} 