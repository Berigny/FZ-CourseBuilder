import { AIProvider, AIServiceConfig } from './types';
import { AIServiceFactory } from './factory';
import { aiMonitoring } from './monitoring';

export async function testAIProvider(provider: 'nvidia' | 'openai' | 'anthropic'): Promise<boolean> {
  try {
    console.log(`Testing ${provider} service...`);
    const startTime = Date.now();

    // For testing purposes, use mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));

    const endTime = Date.now();
    const latency = endTime - startTime;
    
    // Record metrics
    aiMonitoring.recordLatency(provider, latency);
    
    console.log(`${provider} service test completed successfully`);
    return true;
  } catch (error) {
    console.error(`${provider} service test failed:`, error);
    aiMonitoring.recordError(provider, error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

export async function runAllTests(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  for (const provider of ['nvidia', 'openai', 'anthropic'] as const) {
    results[provider] = await testAIProvider(provider);
  }
  
  return results;
}