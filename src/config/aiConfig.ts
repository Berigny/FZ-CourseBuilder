import { z } from 'zod';

// ✅ Environment variable validation schema (added `VITE_OPENROUTER_API_ENDPOINT`)
const envSchema = z.object({
  VITE_OPENROUTER_API_KEY: z.string().min(1),
  VITE_OPENROUTER_API_ENDPOINT: z.string().url().default('https://openrouter.ai/api/v1'),  // ✅ Added this
  VITE_OPENROUTER_MODEL: z.string().min(1),
  VITE_OPENROUTER_MAX_TOKENS: z.coerce.number().positive().default(4000),
  VITE_OPENROUTER_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.7),
  VITE_OPENROUTER_TIMEOUT: z.coerce.number().positive().default(120000),
  VITE_OPENROUTER_RETRY_COUNT: z.coerce.number().positive().default(3),
  VITE_OPENROUTER_RETRY_DELAY: z.coerce.number().positive().default(2000),
  VITE_OPENROUTER_MAX_RETRY_DELAY: z.coerce.number().positive().default(20000)
});

// ✅ Validate environment variables
const env = envSchema.parse({
  VITE_OPENROUTER_API_KEY: process.env.VITE_OPENROUTER_API_KEY || '',
  VITE_OPENROUTER_API_ENDPOINT: process.env.VITE_OPENROUTER_API_ENDPOINT || 'https://openrouter.ai/api/v1', // ✅ Added this
  VITE_OPENROUTER_MODEL: process.env.VITE_OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct',
  VITE_OPENROUTER_MAX_TOKENS: process.env.VITE_OPENROUTER_MAX_TOKENS || '4000',
  VITE_OPENROUTER_TEMPERATURE: process.env.VITE_OPENROUTER_TEMPERATURE || '0.7',
  VITE_OPENROUTER_TIMEOUT: process.env.VITE_OPENROUTER_TIMEOUT || '120000',
  VITE_OPENROUTER_RETRY_COUNT: process.env.VITE_OPENROUTER_RETRY_COUNT || '3',
  VITE_OPENROUTER_RETRY_DELAY: process.env.VITE_OPENROUTER_RETRY_DELAY || '2000',
  VITE_OPENROUTER_MAX_RETRY_DELAY: process.env.VITE_OPENROUTER_MAX_RETRY_DELAY || '20000'
});

// ✅ Directly assign values from `env`
export const aiConfig = {
  apiKey: env.VITE_OPENROUTER_API_KEY,
  apiEndpoint: env.VITE_OPENROUTER_API_ENDPOINT, // ✅ Now dynamically set from env
  modelId: env.VITE_OPENROUTER_MODEL,
  maxTokens: env.VITE_OPENROUTER_MAX_TOKENS,
  temperature: env.VITE_OPENROUTER_TEMPERATURE,
  timeout: env.VITE_OPENROUTER_TIMEOUT,
  retry: {
    count: env.VITE_OPENROUTER_RETRY_COUNT,
    delay: env.VITE_OPENROUTER_RETRY_DELAY,
    maxDelay: env.VITE_OPENROUTER_MAX_RETRY_DELAY
  }
} as const;

// ✅ AI Rules Configuration
export const aiRules = {
  retry: {
    maxAttempts: aiConfig.retry.count,
    backoffFactor: 2,
    initialDelayMs: aiConfig.retry.delay,
    maxDelayMs: aiConfig.retry.maxDelay
  },
  quality: {
    minAcceptableScore: 0.7,
    requiresRefinement: 0.5,
    requiresRewrite: 0.3
  },
  limits: {
    maxTokensPerRequest: aiConfig.maxTokens,
    maxConcurrentRequests: 3,
    maxRequestsPerMinute: 20,
    maxTokensPerMinute: 100000
  }
} as const;

// ✅ Export timeout configuration
export const timeoutConfig = {
  request: aiConfig.timeout,
  socket: aiConfig.timeout * 2,
  keepAlive: true
} as const;

export type AIConfig = typeof aiConfig;
export type TimeoutConfig = typeof timeoutConfig;
