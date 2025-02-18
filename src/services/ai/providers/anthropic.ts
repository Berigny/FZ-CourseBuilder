import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AIServiceConfig } from '../types';
import type { ContentComponent, ContentGap, RefinementSuggestion } from '../../../lib/nvidia';
import { handleAIError } from '../errorHandler';

export class AnthropicService implements AIProvider {
  private client: Anthropic;

  constructor(private config: AIServiceConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey
    });
  }

  async analyzeContent(content: string): Promise<ContentComponent[]> {
    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [{
          role: 'user',
          content: `Analyze this educational content and break it down into components. Return the result as a JSON array: ${content}`
        }]
      });

      const result = response.content[0]?.text;
      if (!result) throw new Error('No response from Anthropic');

      return JSON.parse(result) as ContentComponent[];
    } catch (error) {
      throw handleAIError(error);
    }
  }

  async identifyGaps(components: ContentComponent[]): Promise<ContentGap[]> {
    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [{
          role: 'user',
          content: `Analyze these content components and identify any gaps or areas for improvement. Return the result as a JSON array: ${JSON.stringify(components)}`
        }]
      });

      const result = response.content[0]?.text;
      if (!result) throw new Error('No response from Anthropic');

      return JSON.parse(result) as ContentGap[];
    } catch (error) {
      throw handleAIError(error);
    }
  }

  async generateImprovements(gaps: ContentGap[], components: ContentComponent[]): Promise<RefinementSuggestion[]> {
    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [{
          role: 'user',
          content: `Generate improvements for these content components based on the identified gaps. Return the result as a JSON array:
            Components: ${JSON.stringify(components)}
            Gaps: ${JSON.stringify(gaps)}`
        }]
      });

      const result = response.content[0]?.text;
      if (!result) throw new Error('No response from Anthropic');

      return JSON.parse(result) as RefinementSuggestion[];
    } catch (error) {
      throw handleAIError(error);
    }
  }
}