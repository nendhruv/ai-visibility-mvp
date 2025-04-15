import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { companyData } = await request.json()
    if (!companyData) {
      return NextResponse.json({ error: 'No company data provided' }, { status: 400 })
    }

    const competitorsResp = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: [
        {
          role: "system",
          content: "You are a business analyst. Return a JSON object with a 'competitors' array containing 3-5 likely competitors."
        },
        {
          role: "user",
          content: `Given this company description: "${companyData.companyDescription}" in the "${companyData.industry}" industry, generate 3-5 likely competitors. Return them in this exact JSON format:
{
  "competitors": [
    {
      "name": "Competitor Name",
      "reasoning": "Brief explanation why they are a competitor"
    }
  ]
}`
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    })

    const rawResponse = competitorsResp.choices[0].message.content
    if (!rawResponse) {
      throw new Error('No response from OpenAI')
    }

    const parsedResponse = JSON.parse(rawResponse)
    return NextResponse.json(parsedResponse)
  } catch (error) {
    console.error('Failed to generate competitors:', error)
    return NextResponse.json(
      { error: 'Failed to generate competitors' },
      { status: 500 }
    )
  }
} 