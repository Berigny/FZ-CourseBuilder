import { z } from 'zod';

// ✅ Define `envSchema` correctly
const envSchema = z.object({
  VITE_OPENROUTER_API_KEY: z.string().min(1),
  VITE_OPENROUTER_MODEL: z.string().min(1),
  VITE_OPENROUTER_MAX_TOKENS: z.coerce.number().positive().default(4000),
  VITE_OPENROUTER_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.7),
  VITE_OPENROUTER_TIMEOUT: z.coerce.number().positive().default(120000),
  VITE_OPENROUTER_RETRY_COUNT: z.coerce.number().positive().default(3),
  VITE_OPENROUTER_RETRY_DELAY: z.coerce.number().positive().default(2000),
  VITE_OPENROUTER_MAX_RETRY_DELAY: z.coerce.number().positive().default(20000)
});

const env = envSchema.parse(import.meta.env);

// ✅ OpenRouter Configuration (ONLY DECLARE ONCE)
export const aiConfig = {
  apiKey: env.VITE_OPENROUTER_API_KEY,
  apiEndpoint: 'https://openrouter.ai/api/v1',
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

// ✅ Rate Limiting Configuration
export const rateLimitConfig = {
  maxRequestsPerMinute: 20,
  maxTokensPerMinute: 100000,
  maxConcurrentRequests: 3
} as const;

// ✅ Timeout Configuration
export const timeoutConfig = {
  request: aiConfig.timeout,
  socket: aiConfig.timeout * 2,
  keepAlive: true
} as const;
