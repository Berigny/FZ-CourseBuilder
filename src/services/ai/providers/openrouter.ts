import axios from 'axios';
import type { AIServiceConfig, AIProvider } from '../types';

export class OpenRouterService implements AIProvider {
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  async generateResponse(messages: any[]): Promise<any> {
    try {
      const response = await axios.post(this.config.apiEndpoint, {
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      }, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('OpenRouter API request failed:', error);
      throw new Error('Failed to fetch response from OpenRouter');
    }
  }
}
