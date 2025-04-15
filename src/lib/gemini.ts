import axios from 'axios';

/**
 * Gemini API client for making requests to Google's Gemini model
 */
class GeminiApiClient {
  private apiKey: string;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';
  
  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('GOOGLE_API_KEY not found in environment variables');
    }
  }
  
  /**
   * Runs a prompt through the Gemini model for AI visibility tracking
   */
  async runVisibilityPrompt(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
            topP: 0.95,
            topK: 40
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.candidates[0]?.content?.parts[0]?.text || '';
    } catch (error: any) {
      console.error('Gemini API error:', error.response?.data || error.message);
      throw new Error(`Failed to get response from Gemini: ${error.message}`);
    }
  }
}

// Export a singleton instance
const geminiClient = new GeminiApiClient();
export default geminiClient; 