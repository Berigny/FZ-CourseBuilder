import { ContentComponent, ContentGap, RefinementSuggestion } from '../../lib/nvidia';

export interface AIProvider {
  analyzeContent(content: string): Promise<ContentComponent[]>;
  identifyGaps(components: ContentComponent[]): Promise<ContentGap[]>;
  generateImprovements(gaps: ContentGap[], components: ContentComponent[]): Promise<RefinementSuggestion[]>;
}

export interface AIServiceConfig {
  provider: 'openai' | 'anthropic' | 'nvidia';
  model: string;
  apiKey: string;
  apiEndpoint?: string;
  maxTokens: number;
  temperature: number;
}

export interface AIServiceError {
  code: string;
  message: string;
  retryable: boolean;
}