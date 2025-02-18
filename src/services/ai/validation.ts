import { z } from 'zod';

// Validation schemas for AI service responses
export const contentComponentSchema = z.object({
  type: z.enum(['concept', 'example', 'exercise', 'explanation']),
  content: z.string(),
  metadata: z.object({
    difficulty: z.enum(['basic', 'intermediate', 'advanced']),
    prerequisites: z.array(z.string()).optional(),
    learning_objectives: z.array(z.string()).optional()
  })
});

export const contentGapSchema = z.object({
  type: z.enum(['missing_concept', 'outdated_information', 'insufficient_depth', 'missing_example']),
  description: z.string(),
  suggested_improvements: z.array(z.string()),
  priority: z.enum(['high', 'medium', 'low'])
});

export const refinementSuggestionSchema = z.object({
  original_content: z.string(),
  improved_content: z.string(),
  reasoning: z.string(),
  references: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    date_accessed: z.string().datetime()
  }))
});

export const validateResponse = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid response format: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
};