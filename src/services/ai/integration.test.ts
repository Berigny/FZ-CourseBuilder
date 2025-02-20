import { AIServiceFactory } from './factory';
import { aiMonitoring } from './monitoring';
//import { rateLimiter } from './rateLimit';
import { contentComponentSchema, contentGapSchema, refinementSuggestionSchema } from './validation';
import { z } from 'zod';
import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { applicationRules } from '../../config/rules';

// Configure global axios retry behavior with improved error handling
axiosRetry(axios, {
  retries: applicationRules.ai.retry.maxAttempts,
  retryDelay: (retryCount) => {
    return Math.min(
      applicationRules.ai.retry.initialDelayMs * Math.pow(applicationRules.ai.retry.backoffFactor, retryCount - 1),
      applicationRules.ai.retry.maxDelayMs
    );
  },
  retryCondition: (error: AxiosError) => {
    // Retry on network errors
    if (axiosRetry.isNetworkOrIdempotentRequestError(error)) {
      return true;
    }

    // Retry on specific status codes
    const status = error.response?.status;
    return status === undefined || // Network error
           status === 429 || // Rate limit
           status === 500 || // Internal server error
           status === 502 || // Bad gateway
           status === 503 || // Service unavailable
           status === 504 || // Gateway timeout
           status === 526;   // Invalid SSL certificate
  },
  onRetry: (retryCount, error, requestConfig) => {
    console.log(`Retry attempt ${retryCount} for ${requestConfig.url}`);
    console.log(`Error: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
    }
  }
});

const sampleContent = `
# Introduction to Programming

Programming is the process of creating a set of instructions that tell a computer how to perform a task. 
This guide will help you understand the basics of programming and get started with writing your first program.

## Key Concepts
1. Variables
2. Control Flow
3. Functions
4. Data Structures

Let's explore each of these concepts in detail...
`;

async function validateResponse<T>(data: unknown, schema: z.ZodSchema<T>): Promise<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

async function testProvider(provider: 'nvidia' | 'openai' | 'anthropic') {
  console.log(`\nTesting ${provider.toUpperCase()} provider...`);
  const startTime = Date.now();
  const service = AIServiceFactory.create(provider);

  try {
    // Test content analysis with improved error handling
    console.log('Testing content analysis...');
    let components;
    try {
      components = await service.analyzeContent(sampleContent);
      console.log('Content components:', components.length);
    } catch (error) {
      console.error('Content analysis failed:', error);
      throw error;
    }
    
    // Validate components
    try {
      await Promise.all(components.map((component: unknown) => 
        validateResponse(component, contentComponentSchema)
      ));
    } catch (error) {
      console.error('Component validation failed:', error);
      throw error;
    }

    // Test gap identification with improved error handling
    console.log('Testing gap identification...');
    let gaps;
    try {
      gaps = await service.identifyGaps(components);
      console.log('Identified gaps:', gaps.length);
    } catch (error) {
      console.error('Gap identification failed:', error);
      throw error;
    }
    
    // Validate gaps
    try {
      await Promise.all(gaps.map((gap: unknown) => 
        validateResponse(gap, contentGapSchema)
      ));
    } catch (error) {
      console.error('Gap validation failed:', error);
      throw error;
    }

    // Test improvement generation with improved error handling
    console.log('Testing improvement generation...');
    let improvements;
    try {
      improvements = await service.generateImprovements(gaps, components);
      console.log('Generated improvements:', improvements.length);
    } catch (error) {
      console.error('Improvement generation failed:', error);
      throw error;
    }
    
    // Validate improvements
    try {
      await Promise.all(improvements.map((improvement: unknown) => 
        validateResponse(improvement, refinementSuggestionSchema)
      ));
    } catch (error) {
      console.error('Improvement validation failed:', error);
      throw error;
    }

    // Test rate limiting with controlled concurrency and improved error handling
    console.log('Testing rate limiting...');
    const concurrentRequests = applicationRules.ai.limits.maxConcurrentRequests;
    const requests = Array(concurrentRequests).fill(null).map(() => 
      service.analyzeContent(sampleContent)
    );
    
    const results = await Promise.allSettled(requests);
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`${failures.length} concurrent requests failed`);
      failures.forEach((failure, index) => {
        if (failure.status === 'rejected') {
          console.error(`Request ${index + 1} failed:`, failure.reason);
        }
      });
    }

    const duration = Date.now() - startTime;
    aiMonitoring.recordLatency(provider, duration);
    
    return {
      success: true,
      duration,
      message: `All tests passed successfully in ${duration}ms`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    aiMonitoring.recordError(provider, errorMessage);
    
    return {
      success: false,
      duration: Date.now() - startTime,
      message: errorMessage
    };
  }
}

async function runIntegrationTest() {
  console.log('Starting integration test suite...');
  const results: Record<string, { success: boolean; duration: number; message: string }> = {};

  // Test providers sequentially to avoid overwhelming the system
  for (const provider of ['nvidia', 'openai', 'anthropic'] as const) {
    try {
      results[provider] = await testProvider(provider);
    } catch (error) {
      console.error(`Failed to test ${provider}:`, error);
      results[provider] = {
        success: false,
        duration: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  return results;
}

// Run the integration test suite with improved error handling
runIntegrationTest()
  .then(results => {
    console.log('\nTest Results:');
    let allPassed = true;
    
    Object.entries(results).forEach(([provider, result]) => {
      console.log(`${provider.toUpperCase()}: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Duration: ${result.duration}ms`);
      console.log(`Message: ${result.message}\n`);
      
      if (!result.success) {
        allPassed = false;
      }
    });

    if (!allPassed) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });