import { NextResponse } from 'next/server'
import { generateCustomerPrompts } from '@/lib/openai'
import { store } from '@/lib/store'

export async function POST(request: Request) {
  try {
    const companyData = store.getCompanyData()
    if (!companyData) {
      return NextResponse.json({ error: 'No company data found' }, { status: 400 })
    }

    const prompts = await generateCustomerPrompts(companyData.companyDescription)
    return NextResponse.json({ prompts })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate prompts' }, { status: 500 })
  }
} 