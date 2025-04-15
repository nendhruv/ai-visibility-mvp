import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { runChatGptVisibilityPrompt } from '@/lib/openai'
import claudeClient from '@/lib/claude'
import geminiClient from '@/lib/gemini'
import { Company } from '@/models/Company'
import connectDB from '@/lib/db'

// Helper function to enhance prompt with industry context
function enhancePromptWithIndustry(prompt: string, industry: string): string {
  return `${prompt} from ${industry} industry`;
}

export async function POST(request: Request) {
  try {
    await connectDB()
    
    // Get user from JWT token
    const token = cookies().get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token and get userId
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    // Get request body
    const { prompt, model, industry, brand, competitors } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      )
    }

    // Enhance the prompt with industry if provided
    const enhancedPrompt = industry ? enhancePromptWithIndustry(prompt, industry) : prompt;
    
    let responseData;
    
    // If a specific model is requested, use only that model
    if (model && model !== 'all') {
      let response: string;
      
      switch (model) {
        case 'ChatGPT':
          response = await runChatGptVisibilityPrompt(enhancedPrompt);
          responseData = {
            response: response,
            model: model
          };
          break;
        case 'Claude':
          response = await claudeClient.runVisibilityPrompt(enhancedPrompt);
          responseData = {
            response: response,
            model: model
          };
          break;
        case 'Gemini':
          response = await geminiClient.runVisibilityPrompt(enhancedPrompt);
          responseData = {
            response: response,
            model: model
          };
          break;
        default:
          response = await runChatGptVisibilityPrompt(enhancedPrompt);
          responseData = {
            response: response,
            model: 'ChatGPT'
          };
      }
    } else {
      // Query all three models and return results from all
      try {
        const [chatGptResponse, claudeResponse, geminiResponse] = await Promise.all([
          runChatGptVisibilityPrompt(enhancedPrompt).catch(err => {
            console.error('ChatGPT error:', err);
            return null;
          }),
          claudeClient.runVisibilityPrompt(enhancedPrompt).catch(err => {
            console.error('Claude error:', err);
            return null;
          }),
          geminiClient.runVisibilityPrompt(enhancedPrompt).catch(err => {
            console.error('Gemini error:', err);
            return null;
          })
        ]);
        
        const results = [];
        
        if (chatGptResponse) {
          results.push({
            model: 'ChatGPT',
            response: chatGptResponse
          });
        }
        
        if (claudeResponse) {
          results.push({
            model: 'Claude',
            response: claudeResponse
          });
        }
        
        if (geminiResponse) {
          results.push({
            model: 'Gemini',
            response: geminiResponse
          });
        }
        
        if (results.length === 0) {
          throw new Error('All models failed to generate responses');
        }
        
        responseData = {
          results: results,
          allModels: true
        };
      } catch (error) {
        console.error('Error with multiple models:', error);
        // Fall back to just ChatGPT if there's an error with the parallel approach
        const fallbackResponse = await runChatGptVisibilityPrompt(enhancedPrompt);
        responseData = {
          response: fallbackResponse,
          model: 'ChatGPT',
          fallback: true
        };
      }
    }

    // Save responses to database
    try {
      const company = await Company.findOne({ userId: decoded.userId })
      if (!company) {
        throw new Error('Company not found')
      }

      // Initialize aiVisibility if it doesn't exist
      if (!company.aiVisibility) {
        company.aiVisibility = {
          geoScore: 0,
          brandMentions: 0,
          competitorMentions: 0,
          overallPresence: 0,
          promptResponses: [],
          dailyMetrics: []
        }
      }

      // Process and save responses
      const timestamp = new Date().toISOString()
      
      if (responseData.allModels && responseData.results) {
        // Add all model responses
        const newResponses = responseData.results.map(result => {
          const responseText = result.response.toLowerCase();
          const brandLower = (brand || '').toLowerCase();
          
          // Check if brand is mentioned and find its position
          const brandMentioned = brandLower && responseText.includes(brandLower);
          let position = 'Not Ranked';
          let marketPosition = '';
          
          // Log for debugging
          console.log(`Brand: ${brand}, Found in response: ${brandMentioned}, Brand lower: ${brandLower}`);
          
          if (brandMentioned) {
            // Calculate position based on where the brand appears in the text
            const brandIndex = responseText.indexOf(brandLower);
            const beforeText = responseText.substring(0, brandIndex);
            
            // Check if this is part of a list by looking for numbers, bullets, or company names
            const listItemRegex = /(\d+[\.\)][^\n]+|\*[^\n]+|•[^\n]+|([A-Z][a-z]+\s?)+:)/g;
            const listItems = beforeText.match(listItemRegex) || [];
            
            // If found in what appears to be a list, calculate position
            if (listItems.length > 0) {
              position = `#${listItems.length + 1}`;
            }
            
            // Try to extract market position by looking for phrases around the brand mention
            const context = responseText.substring(Math.max(0, brandIndex - 100), 
              Math.min(responseText.length, brandIndex + 100));
            
            if (context.includes('leader') || context.includes('top') || context.includes('best')) {
              marketPosition = 'Market Leader';
            } else if (context.includes('popular') || context.includes('well-known')) {
              marketPosition = 'Well-Known Brand';
            } else if (context.includes('emerging') || context.includes('growing')) {
              marketPosition = 'Emerging Brand';
            } else if (context.includes('alternative') || context.includes('competitor')) {
              marketPosition = 'Alternative Option';
            } else {
              marketPosition = 'Mentioned Brand';
            }
          }
          
          // Check for competitor mentions and their positions
          const competitorsMentioned = (competitors || []).map((comp: { name: string }) => {
            const compNameLower = comp.name.toLowerCase();
            if (responseText.includes(compNameLower)) {
              const compIndex = responseText.indexOf(compNameLower);
              const beforeCompText = responseText.substring(0, compIndex);
              const listItemsComp = beforeCompText.match(/(\d+[\.\)][^\n]+|\*[^\n]+|•[^\n]+|([A-Z][a-z]+\s?)+:)/g) || [];
              
              return {
                name: comp.name,
                position: listItemsComp.length > 0 ? `#${listItemsComp.length + 1}` : 'Mentioned'
              };
            }
            return null;
          }).filter(Boolean).map((comp: any) => comp.name);
          
          return {
            prompt: enhancedPrompt,
            response: result.response,
            model: result.model,
            brandMentioned,
            competitorsMentioned,
            position,
            marketPosition,
            sentiment: 'neutral',
            date: timestamp,
            scanTime: timestamp
          };
        });
        
        company.aiVisibility.promptResponses.push(...newResponses);
      } else if (responseData.response) {
        // Add single model response
        const responseText = (responseData.response || '').toLowerCase();
        const brandLower = (brand || '').toLowerCase();
        
        // Check if brand is mentioned and find its position
        const brandMentioned = brandLower && responseText.includes(brandLower);
        let position = 'Not Ranked';
        let marketPosition = '';
        
        // Log for debugging
        console.log(`Brand: ${brand}, Found in response: ${brandMentioned}, Brand lower: ${brandLower}`);
        
        if (brandMentioned) {
          // Calculate position based on where the brand appears in the text
          const brandIndex = responseText.indexOf(brandLower);
          const beforeText = responseText.substring(0, brandIndex);
          
          // Check if this is part of a list by looking for numbers, bullets, or company names
          const listItemRegex = /(\d+[\.\)][^\n]+|\*[^\n]+|•[^\n]+|([A-Z][a-z]+\s?)+:)/g;
          const listItems = beforeText.match(listItemRegex) || [];
          
          // If found in what appears to be a list, calculate position
          if (listItems.length > 0) {
            position = `#${listItems.length + 1}`;
          }
          
          // Try to extract market position by looking for phrases around the brand mention
          const context = responseText.substring(Math.max(0, brandIndex - 100), 
            Math.min(responseText.length, brandIndex + 100));
          
          if (context.includes('leader') || context.includes('top') || context.includes('best')) {
            marketPosition = 'Market Leader';
          } else if (context.includes('popular') || context.includes('well-known')) {
            marketPosition = 'Well-Known Brand';
          } else if (context.includes('emerging') || context.includes('growing')) {
            marketPosition = 'Emerging Brand';
          } else if (context.includes('alternative') || context.includes('competitor')) {
            marketPosition = 'Alternative Option';
          } else {
            marketPosition = 'Mentioned Brand';
          }
        }
        
        // Check for competitor mentions and their positions
        const competitorsMentioned = (competitors || []).map((comp: { name: string }) => {
          const compNameLower = comp.name.toLowerCase();
          if (responseText.includes(compNameLower)) {
            const compIndex = responseText.indexOf(compNameLower);
            const beforeCompText = responseText.substring(0, compIndex);
            const listItemsComp = beforeCompText.match(/(\d+[\.\)][^\n]+|\*[^\n]+|•[^\n]+|([A-Z][a-z]+\s?)+:)/g) || [];
            
            return {
              name: comp.name,
              position: listItemsComp.length > 0 ? `#${listItemsComp.length + 1}` : 'Mentioned'
            };
          }
          return null;
        }).filter(Boolean).map((comp: any) => comp.name);
        
        company.aiVisibility.promptResponses.push({
          prompt: enhancedPrompt,
          response: responseData.response || '',
          model: responseData.model,
          brandMentioned,
          competitorsMentioned,
          position,
          marketPosition,
          sentiment: 'neutral',
          date: timestamp,
          scanTime: timestamp
        });
      }

      // Update metrics
      const brandMentions = company.aiVisibility.promptResponses.filter((r: { brandMentioned: boolean }) => r.brandMentioned).length
      const competitorMentions = company.aiVisibility.promptResponses.reduce((sum: number, r: { competitorsMentioned: any[] }) => sum + r.competitorsMentioned.length, 0)
      const totalResponses = company.aiVisibility.promptResponses.length
      
      company.aiVisibility.brandMentions = brandMentions
      company.aiVisibility.competitorMentions = competitorMentions
      company.aiVisibility.overallPresence = totalResponses > 0 ? (brandMentions / totalResponses) * 100 : 0
      company.aiVisibility.geoScore = company.aiVisibility.overallPresence // Can be adjusted with more complex scoring

      await company.save()
    } catch (dbError) {
      console.error('Error saving to database:', dbError)
      // Continue with the response even if save fails
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error generating response:', error)
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate response' },
      { status: 500 }
    )
  }
} 