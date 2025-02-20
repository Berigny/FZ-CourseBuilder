import axios from 'axios';
import axiosRetry from 'axios-retry';
import type { AIProvider, AIServiceConfig } from '../types';
import type { ContentComponent, ContentGap, RefinementSuggestion } from '../../../lib/nvidia';
import { handleAIError } from '../errorHandler';
import { validateResponse, contentComponentSchema, contentGapSchema, refinementSuggestionSchema } from '../validation';
import { nvidiaConfig, timeoutConfig, aiRules } from '../../../config/aiConfig';
import { rateLimiter } from '../rateLimit';

export class NvidiaService implements AIProvider {
  private client: ReturnType<typeof axios.create>;

  constructor(private config: AIServiceConfig) {
    this.client = axios.create({
      baseURL: nvidiaConfig.apiEndpoint,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nvidiaConfig.apiKey}`,
        'X-Model-ID': nvidiaConfig.modelId
      },
      timeout: timeoutConfig.request,
      socketTimeout: timeoutConfig.socket,
      keepAlive: timeoutConfig.keepAlive
    });

    // Configure retry behavior
    axiosRetry(this.client, {
      retries: aiRules.retry.maxAttempts,
      retryDelay: (retryCount) => {
        const delay = Math.min(
          aiRules.retry.initialDelayMs * Math.pow(aiRules.retry.backoffFactor, retryCount - 1),
          aiRules.retry.maxDelayMs
        );
        return delay;
      },
      retryCondition: (error) => {
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          [429, 503, 504].includes(error.response?.status ?? 0)
        );
      }
    });
  }

  private async executeWithRateLimit<T>(
    operation: () => Promise<T>,
    estimatedTokens: number
  ): Promise<T> {
    const hasPermit = await rateLimiter.acquirePermit(estimatedTokens);
    
    if (!hasPermit) {
      return new Promise((resolve, reject) => {
        rateLimiter.enqueue(async () => {
          try {
            const result = await operation();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            rateLimiter.releasePermit(estimatedTokens);
          }
        });
      });
    }

    try {
      return await operation();
    } finally {
      rateLimiter.releasePermit(estimatedTokens);
    }
  }

  async analyzeContent(content: string): Promise<ContentComponent[]> {
    const estimatedTokens = Math.ceil(content.length / 4); // Rough estimate

    return this.executeWithRateLimit(async () => {
      try {
        const response = await this.client.post('/analyze', {
          content,
          settings: {
            model: nvidiaConfig.modelId,
            max_tokens: nvidiaConfig.maxTokens,
            temperature: nvidiaConfig.temperature
          }
        });

        const components = response.data.components;
        if (!components) throw new Error('No components in NVIDIA API response');

        return components.map(component => 
          validateResponse(contentComponentSchema, component)
        );
      } catch (error) {
        throw handleAIError(error);
      }
    }, estimatedTokens);
  }

  async identifyGaps(components: ContentComponent[]): Promise<ContentGap[]> {
    const estimatedTokens = Math.ceil(JSON.stringify(components).length / 4);

    return this.executeWithRateLimit(async () => {
      try {
        const response = await this.client.post('/identify-gaps', {
          components,
          settings: {
            model: nvidiaConfig.modelId,
            max_tokens: nvidiaConfig.maxTokens,
            temperature: nvidiaConfig.temperature
          }
        });

        const gaps = response.data.gaps;
        if (!gaps) throw new Error('No gaps identified in NVIDIA API response');

        return gaps.map(gap => 
          validateResponse(contentGapSchema, gap)
        );
      } catch (error) {
        throw handleAIError(error);
      }
    }, estimatedTokens);
  }

  async generateImprovements(gaps: ContentGap[], components: ContentComponent[]): Promise<RefinementSuggestion[]> {
    const estimatedTokens = Math.ceil((JSON.stringify(gaps) + JSON.stringify(components)).length / 4);

    return this.executeWithRateLimit(async () => {
      try {
        const response = await this.client.post('/generate-improvements', {
          gaps,
          components,
          settings: {
            model: nvidiaConfig.modelId,
            max_tokens: nvidiaConfig.maxTokens,
            temperature: nvidiaConfig.temperature
          }
        });

        const improvements = response.data.improvements;
        if (!improvements) throw new Error('No improvements generated in NVIDIA API response');

        return improvements.map(improvement => 
          validateResponse(refinementSuggestionSchema, improvement)
        );
      } catch (error) {
        throw handleAIError(error);
      }
    }, estimatedTokens);
  }
}