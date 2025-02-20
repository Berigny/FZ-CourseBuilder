//import type { AIServiceError } from './types';
import { AxiosError } from 'axios';
import { z } from 'zod';
import { aiMonitoring } from './monitoring';

export function handleAIError(error: unknown): ProcessingResult {
  console.error('Handling AI error:', error);

  // Handle Axios errors
  if (error instanceof AxiosError) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    aiMonitoring.recordError('openrouter', errorMessage);

    if (error.response) {
      // OpenRouter specific error codes
      switch (error.response.status) {
        case 429:
          return {
            success: false,
            error: 'Rate limit exceeded. Please wait a moment and try again.'
          };
        case 400:
          return {
            success: false,
            error: `Invalid request: ${errorMessage}`
          };
        case 401:
          return {
            success: false,
            error: 'Authentication failed. Please check your API key.'
          };
        case 402:
          return {
            success: false,
            error: 'Insufficient credits. Please check your OpenRouter account.'
          };
        case 404:
          return {
            success: false,
            error: 'The requested model is currently unavailable. Please try again later.'
          };
        case 413:
          return {
            success: false,
            error: 'Content too long for processing. Please try a shorter document.'
          };
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            success: false,
            error: 'Service temporarily unavailable. Please try again in a moment.'
          };
        default:
          return {
            success: false,
            error: `API error (${error.response.status}): ${errorMessage}`
          };
      }
    }

    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'Request timed out. Please try again.'
      };
    }

    if (error.message === 'Network Error') {
      return {
        success: false,
        error: 'Network connection error. Please check your internet connection and try again.'
      };
    }
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    const validationErrors = error.errors.map(e => e.message).join(', ');
    return {
      success: false,
      error: `Invalid response format: ${validationErrors}`
    };
  }

  // Handle other types of errors
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  aiMonitoring.recordError('openrouter', errorMessage);
  
  return {
    success: false,
    error: errorMessage
  };
}

interface ProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
}