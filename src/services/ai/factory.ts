import type { AIProvider, AIServiceConfig } from './types';
import { OpenAIService } from './providers/openai';
import { AnthropicService } from './providers/anthropic';
import { NvidiaService } from './providers/nvidia';
import { OpenRouterService } from './providers/openrouter';  // ✅ Add OpenRouter provider

export class AIServiceFactory {
  private static config: Record<string, AIServiceConfig> = {
    openai: {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      maxTokens: 8000,
      temperature: 0.7
    },
    anthropic: {
      provider: 'anthropic',
      model: 'claude-2',
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
      maxTokens: 100000,
      temperature: 0.5
    },
    nvidia: {
      provider: 'nvidia',
      model: 'nv-gpt-4',
      apiKey: import.meta.env.VITE_NVIDIA_API_KEY || '',
      apiEndpoint: import.meta.env.VITE_NVIDIA_API_ENDPOINT || '',
      maxTokens: 8000,
      temperature: 0.7
    },
    openrouter: {  // ✅ Add OpenRouter
      provider: 'openrouter',
      model: 'mistralai/mistral-7b-instruct',
      apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
      apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
      maxTokens: 4000,
      temperature: 0.7
    }
  };

  static create(provider: 'openai' | 'anthropic' | 'nvidia' | 'openrouter'): AIProvider {
    const config = this.config[provider];
    if (!config) {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    if (!config.apiKey) {
      throw new Error(`API key not configured for provider: ${provider}`);
    }

    switch (provider) {
      case 'openai':
        return new OpenAIService(config);
      case 'anthropic':
        return new AnthropicService(config);
      case 'nvidia':
        return new NvidiaService(config);
      case 'openrouter':  // ✅ Add OpenRouter case
        return new OpenRouterService(config);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
}
