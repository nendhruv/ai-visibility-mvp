import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateCompanyDescription(text: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a business analyst. Generate a concise company description based on the provided text."
      },
      {
        role: "user",
        content: `Generate a concise company description from this text: ${text}`
      }
    ],
    temperature: 0.7,
  })

  return response.choices[0].message.content || ''
}

export async function identifyIndustry(description: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "Identify the industry in a short phrase (e.g., 'online gift hamper services')"
      },
      {
        role: "user",
        content: description
      }
    ],
    temperature: 0.3,
  })

  return response.choices[0].message.content || ''
}

export async function generateIndustryPrompts(industry: string): Promise<any> {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "Generate 8-10 common search queries for the given industry. Include intent and volume labels."
      },
      {
        role: "user",
        content: `Generate search queries as JSON array with fields: query, intent (Discovery/High Intent/Medium Intent/Low Intent), and volume (Low Volume/Medium Volume/High Volume) for industry: ${industry}`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  })

  return JSON.parse(response.choices[0].message.content || '{}')
}

export async function generateCompetitors(description: string): Promise<any> {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "Generate 3-5 likely competitors based on the company description. Include reasoning."
      },
      {
        role: "user",
        content: `Generate competitors as JSON array with fields: name, reasoning for company: ${description}`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  })

  return JSON.parse(response.choices[0].message.content || '{}')
}

export async function generateCustomerPrompts(description: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "Generate 8-10 common customer search queries based on the company description."
      },
      {
        role: "user",
        content: `Generate search queries as JSON array for company: ${description}`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  })

  return JSON.parse(response.choices[0].message.content || '{}').queries
}

export async function checkBrandMentions(prompt: string, brand: string): Promise<{ response: string; mentions: number }> {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
  })

  const content = response.choices[0].message.content || ''
  const mentions = (content.match(new RegExp(brand, 'gi')) || []).length

  return {
    response: content,
    mentions
  }
}

/**
 * Runs a prompt through the OpenAI ChatGPT model for AI visibility tracking
 */
export async function runChatGptVisibilityPrompt(prompt: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant providing information about products, services, and companies. Answer questions directly and mention relevant companies in your response.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error: any) {
    console.error('ChatGPT API error:', error);
    throw new Error(`Failed to get response from ChatGPT: ${error.message}`);
  }
}

// More OpenAI-related functions will be added in the next parts... 