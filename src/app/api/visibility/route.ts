import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI()

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // First, get the AI perception
    const perceptionPrompt = `Analyze the website ${url} and provide:
    1. A comprehensive description of what the company does
    2. Their industry
    3. A list of their key products or services
    
    Format the response as JSON with the following structure:
    {
      "description": "company description here",
      "industry": "industry name",
      "keyProducts": ["product1", "product2", ...]
    }`

    const perceptionCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: [
        {
          role: "system",
          content: "You are an AI analyst that provides structured analysis of company websites."
        },
        {
          role: "user",
          content: perceptionPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    })

    const perception = JSON.parse(perceptionCompletion.choices[0].message.content || '{}')

    // Generate a question based on the perception
    const questionPrompt = `Based on this company description: "${perception.description}"
    
    Generate a simple question that would help identify this company, following these rules:
    1. Question should be about their main business/service
    2. Question should be specific enough that it could identify this company
    3. Question should ask to "name the company that..." or "which company..."
    4. Question should expect just a company name as the answer
    
    Format the response as JSON with the following structure:
    {
      "question": "your generated question here"
    }`

    const questionCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: [
        {
          role: "system",
          content: "You are generating targeted questions to identify companies."
        },
        {
          role: "user",
          content: questionPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    })

    const questionData = JSON.parse(questionCompletion.choices[0].message.content || '{}')

    // Then, get the ChatGPT visibility test
    const visibilityPrompt = `
    
    Question: "${questionData.question}"
    
    Provide the answer that ChatGPT would give to this question based on the available information.
    
    Format the response as JSON with the following structure:
    {
      "question": "${questionData.question}",
      "answer": "the answer ChatGPT would give"
    }`

    const visibilityCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: [
        {
          role: "system",
          content: "You are simulating how ChatGPT would respond to questions about companies."
        },
        {
          role: "user",
          content: visibilityPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    })

    const visibility = JSON.parse(visibilityCompletion.choices[0].message.content || '{}')

    // Combine the results
    const results = {
      perception: {
        description: perception.description,
        industry: perception.industry,
        keyProducts: perception.keyProducts
      },
      chatGPT: {
        question: visibility.question,
        answer: visibility.answer
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Visibility report error:', error)
    return NextResponse.json(
      { error: 'Failed to generate visibility report' },
      { status: 500 }
    )
  }
} 