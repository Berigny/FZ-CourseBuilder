import OpenAI from 'openai';
import type { AIProvider, AIServiceConfig } from '../types';
import type { ContentComponent, ContentGap, RefinementSuggestion } from '../../../lib/nvidia';
import { handleAIError } from '../errorHandler';

export class OpenAIService implements AIProvider {
  private client: OpenAI;

  constructor(private config: AIServiceConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      maxRetries: 3
    });
  }

  async analyzeContent(content: string): Promise<ContentComponent[]> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content analyzer. Break down the content into logical components.'
          },
          {
            role: 'user',
            content: `Analyze this educational content and break it down into components: ${content}`
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      const result = response.choices[0]?.message?.content;
      if (!result) throw new Error('No response from OpenAI');

      return JSON.parse(result) as ContentComponent[];
    } catch (error) {
      throw handleAIError(error);
    }
  }

  async identifyGaps(components: ContentComponent[]): Promise<ContentGap[]> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at identifying gaps in educational content.'
          },
          {
            role: 'user',
            content: `Analyze these content components and identify any gaps or areas for improvement: ${JSON.stringify(components)}`
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      const result = response.choices[0]?.message?.content;
      if (!result) throw new Error('No response from OpenAI');

      return JSON.parse(result) as ContentGap[];
    } catch (error) {
      throw handleAIError(error);
    }
  }

  async generateImprovements(gaps: ContentGap[], components: ContentComponent[]): Promise<RefinementSuggestion[]> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at improving educational content.'
          },
          {
            role: 'user',
            content: `Generate improvements for these content components based on the identified gaps:
              Components: ${JSON.stringify(components)}
              Gaps: ${JSON.stringify(gaps)}`
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      const result = response.choices[0]?.message?.content;
      if (!result) throw new Error('No response from OpenAI');

      return JSON.parse(result) as RefinementSuggestion[];
    } catch (error) {
      throw handleAIError(error);
    }
  }
}