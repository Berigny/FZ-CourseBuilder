import { z } from 'zod';

/**
 * Core Application Rules
 * 
 * This file serves as the source of truth for the application's core principles,
 * behaviors, and constraints. All rule changes should be made here and referenced
 * throughout the application.
 */

// Content Processing Rules
export const contentRules = {
  // Document rules
  document: {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] as const,
    minContentLength: 200, // characters
  },

  // Lesson rules
  lesson: {
    categories: ['core', 'supplementary', 'exploratory'] as const,
    statuses: ['processing', 'complete', 'failed', 'needs_refinement', 'incomplete'] as const,
    minQualityScore: 0.7, // 70% minimum quality score
    minReadingTime: 1, // minutes
  },

  // Course rules
  course: {
    maxLessonsPerCourse: 100,
    requiresUniqueTitle: true,
    maxTitleLength: 100,
    maxDescriptionLength: 500,
  }
} as const;

// AI Processing Rules
export const aiRules = {
  // Quality thresholds
  quality: {
    minAcceptableScore: 0.7,
    requiresRefinement: 0.5,
    requiresRewrite: 0.3,
  },

  // Processing limits
  limits: {
    maxTokensPerRequest: 8000,
    maxConcurrentRequests: 5,
    maxRequestsPerMinute: 60,
    maxTokensPerMinute: 90000,
  },

  // Retry behavior
  retry: {
    maxAttempts: 3,
    backoffFactor: 2,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
  },

  // Agent configuration
  agents: {
    architect: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      role: 'Orchestrates workflow and plans lesson structure'
    },
    analyzer: {
      provider: 'anthropic',
      model: 'claude-2',
      temperature: 0.5,
      role: 'Extracts concepts and evaluates difficulty'
    },
    evaluator: {
      provider: 'nvidia',
      model: 'nv-gpt-4',
      temperature: 0.7,
      role: 'Scores content quality and suggests improvements'
    },
    refinement: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      role: 'Enhances content clarity and engagement'
    },
    integration: {
      provider: 'anthropic',
      model: 'claude-2',
      temperature: 0.5,
      role: 'Ensures consistency and validates references'
    }
  }
} as const;

// User Interaction Rules
export const userRules = {
  // Authentication
  auth: {
    requiresEmail: true,
    minPasswordLength: 6,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
  },

  // Content access
  access: {
    canViewOwnContent: true,
    canEditOwnContent: true,
    canDeleteOwnContent: true,
    requiresAuthentication: true,
  },

  // Rate limiting
  rateLimit: {
    maxUploadsPerHour: 20,
    maxProcessingRequestsPerDay: 100,
    cooldownPeriodMinutes: 5,
  }
} as const;

// Storage Rules
export const storageRules = {
  // File storage
  files: {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['pdf', 'doc', 'docx'] as const,
    pathTemplate: '{userId}/{timestamp}-{filename}',
    expiryHours: 24,
  },

  // Content storage
  content: {
    maxLessonSizeBytes: 100 * 1024, // 100KB
    maxMetadataSizeBytes: 16 * 1024, // 16KB
    requiresBackup: true,
    backupFrequencyHours: 24,
  },

  // Security
  security: {
    enableRLS: true,
    enableAuditLogging: true,
    enableSoftDeletes: true,
    enableVersioning: true,
    backupEnabled: true
  }
} as const;

// Validation Schemas
export const validationSchemas = {
  lesson: z.object({
    title: z.string().min(1).max(contentRules.course.maxTitleLength),
    content: z.string().min(contentRules.document.minContentLength),
    category: z.enum(contentRules.lesson.categories),
    status: z.enum(contentRules.lesson.statuses),
  }),

  course: z.object({
    title: z.string().min(1).max(contentRules.course.maxTitleLength),
    description: z.string().max(contentRules.course.maxDescriptionLength).optional(),
  }),

  topic: z.object({
    title: z.string().min(1).max(contentRules.course.maxTitleLength),
    description: z.string().max(contentRules.course.maxDescriptionLength).optional(),
    order: z.number().int().min(0),
  })
} as const;

// Export all rules as a single object for easy access
export const applicationRules = {
  content: contentRules,
  ai: aiRules,
  user: userRules,
  storage: storageRules,
  validation: validationSchemas,
} as const;

// Type exports for TypeScript usage
export type ContentRules = typeof contentRules;
export type AIRules = typeof aiRules;
export type UserRules = typeof userRules;
export type StorageRules = typeof storageRules;
export type ValidationSchemas = typeof validationSchemas;
export type ApplicationRules = typeof applicationRules;