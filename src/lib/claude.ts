import axios from 'axios';

/**
 * Claude API client for making requests to Anthropic's Claude model
 */
class ClaudeApiClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.anthropic.com/v1';
  
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      console.warn('ANTHROPIC_API_KEY not found in environment variables');
    }
  }
  
  /**
   * Runs a prompt through the Claude model for AI visibility tracking
   */
  async runVisibilityPrompt(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      return response.data.content[0]?.text || '';
    } catch (error: any) {
      console.error('Claude API error:', error.response?.data || error.message);
      throw new Error(`Failed to get response from Claude: ${error.message}`);
    }
  }
}

// Export a singleton instance
const claudeClient = new ClaudeApiClient();
export default claudeClient; 