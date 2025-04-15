import { NextResponse } from 'next/server'
import { crawlWebsite } from '@/lib/crawler'
import OpenAI from 'openai'
import { store } from '@/lib/store'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '@/lib/config'

export const runtime = 'nodejs' // Force Node.js runtime

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Limit text to avoid token overflow
function limitText(text: string, maxLength = 10000): string {
  if (text.length <= maxLength) return text;
  
  // Try to find a good breaking point near maxLength
  const breakPoint = text.lastIndexOf("\n\n", maxLength);
  if (breakPoint > maxLength * 0.8) {
    return text.slice(0, breakPoint);
  }
  
  return text.slice(0, maxLength);
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const token = cookies().get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    try {
      jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const { domain, brand } = await request.json()
    
    if (!domain || !brand) {
      return NextResponse.json(
        { error: "Please provide both a domain and a brand." },
        { status: 400 }
      )
    }

    // Get raw text from website
    let rawText = await crawlWebsite(domain)
    
    // Check if the text indicates an error
    if (rawText.startsWith('Error') || rawText.startsWith('Failed') || rawText.startsWith('Could not') || rawText.startsWith('No crawlable')) {
      return NextResponse.json(
        { error: rawText },
        { status: 400 }
      )
    }
    
    // Limit text to avoid token overflow
    rawText = limitText(rawText);

    try {
      // Generate company description
      const summaryResp = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful summarization assistant." },
          { role: "user", content: `Summarize the following website text into a concise "company description" that explains what the company does, the products/services offered, and key value propositions (max 200 words).\nText:\n"""\n${rawText}\n"""` },
        ],
        temperature: 0.7,
        max_tokens: 500,
      })
      const companyDescription = summaryResp.choices[0].message.content?.trim() || ''

      // Identify industry from the description
      const industryResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a business classification assistant." },
          { role: "user", content: `Given the following company description:\n"${companyDescription}"\n\nPlease identify the broad industry or category of this business in a concise phrase (3-6 words).\nIf uncertain, guess the closest relevant industry.` },
        ],
        temperature: 0.7,
        max_tokens: 50,
      })
      const industry = industryResp.choices[0].message.content?.trim() || ''

      // Generate industry-level prompts with a more structured prompt
      const industryPromptsResp = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        messages: [
          {
            role: "system",
            content: `You are a market research and SEO expert assistant. Generate search queries that:
1. Include both generic industry terms and brand-specific queries
2. Cover different user intents (Discovery for general searches, High Intent for purchase-ready searches)
3. Accurately estimate search volume (Low/High/Very High Volume)
4. Include a mix of different search types`
          },
          {
            role: "user",
            content: `Create 10 highly relevant search queries for ${brand} in the "${industry}" industry. Include both branded and non-branded queries.

Return them in this exact JSON format:
{
  "prompts": [
    {
      "query": "string",
      "intent": "Discovery|High Intent",
      "volume": "Low Volume|High Volume|Very High Volume"
    }
  ]
}`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
        max_tokens: 1024
      })

      let industryPrompts = []
      try {
        const rawPrompts = industryPromptsResp.choices[0].message.content
        if (rawPrompts) {
          const parsedResponse = JSON.parse(rawPrompts)
          industryPrompts = parsedResponse.prompts || []
        }
      } catch (e) {
        console.error('Failed to parse industry prompts:', e)
        industryPrompts = []
      }

      const responseData = {
        success: true,
        domain,
        brand,
        companyDescription,
        industry,
        industryPrompts,
        textLength: rawText.length,
      }

      // Store the data before returning
      store.setCompanyData(responseData)

      return NextResponse.json(responseData)
    } catch (error: any) {
      if (error?.error?.code === 'context_length_exceeded') {
        return NextResponse.json(
          { error: 'The extracted website content is too large to process. Try a simpler website.' },
          { status: 400 }
        )
      }
      throw error // Re-throw for general error handler
    }
  } catch (error) {
    console.error("Error in /crawl with industry detection:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.toString() : 'An unknown error occurred' },
      { status: 500 }
    )
  }
} 