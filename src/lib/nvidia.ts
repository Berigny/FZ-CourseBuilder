import axios from 'axios';
import axiosRetry from 'axios-retry';
import { supabase } from './supabase';
import { aiConfig, timeoutConfig, aiRules } from '../config/aiConfig';
import { rateLimiter } from '../services/ai/rateLimit';
import { handleAIError } from '../services/ai/errorHandler';
import { aiMonitoring } from '../services/ai/monitoring';

interface ProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class NvidiaAIProcessor {
  private static instance: NvidiaAIProcessor;
  private client: ReturnType<typeof axios.create>;

  private constructor() {
    if (!aiConfig.apiKey || !aiConfig.apiEndpoint || !aiConfig.modelId) {
      throw new Error('Missing required OpenRouter configuration');
    }

    this.client = axios.create({
      baseURL: aiConfig.apiEndpoint,
      headers: {
        'Authorization': `Bearer ${aiConfig.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://gilded-raindrop-fd3c3f.netlify.app',
        'X-Title': 'Educational Content Processing System'
      },
      timeout: timeoutConfig.request,
      validateStatus: (status) => status >= 200 && status < 300
    });

    axiosRetry(this.client, {
      retries: aiRules.retry.maxAttempts,
      retryDelay: (retryCount) => {
        const delay = Math.min(
          aiRules.retry.initialDelayMs * Math.pow(2, retryCount - 1),
          aiRules.retry.maxDelayMs
        );
        return delay;
      },
      retryCondition: (error) => {
        if (!error.response) return true;
        const status = error.response.status;
        return status === 429 || (status >= 500 && status <= 599);
      }
    });
  }

  static getInstance(): NvidiaAIProcessor {
    if (!NvidiaAIProcessor.instance) {
      NvidiaAIProcessor.instance = new NvidiaAIProcessor();
    }
    return NvidiaAIProcessor.instance;
  }

  private async executeWithRateLimit<T>(
    operation: () => Promise<T>,
    estimatedTokens: number
  ): Promise<T> {
    const startTime = Date.now();
    let permit = false;
    
    try {
      permit = await rateLimiter.acquirePermit(estimatedTokens);
      
      if (!permit) {
        return rateLimiter.enqueue(operation);
      }

      const result = await operation();
      const duration = Date.now() - startTime;
      aiMonitoring.recordLatency('openrouter', duration);
      aiMonitoring.recordTokenUsage('openrouter', estimatedTokens);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      aiMonitoring.recordLatency('openrouter', duration);
      aiMonitoring.recordError('openrouter', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      if (permit) {
        rateLimiter.releasePermit(estimatedTokens);
      }
    }
  }

  static async processDocument(file: File): Promise<ProcessingResult> {
    try {
      const instance = NvidiaAIProcessor.getInstance();
      const estimatedTokens = Math.ceil(file.size / 4);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      const fileContent = await file.text();
      if (!fileContent.trim()) {
        throw new Error('Empty or invalid file content');
      }

      return instance.executeWithRateLimit(async () => {
        try {
          const response = await instance.client.post('', {
            model: aiConfig.modelId,
            messages: [
              {
                role: 'system',
                content: 'You are an expert at processing educational content and extracting structured information.'
              },
              {
                role: 'user',
                content: `Process this educational document and extract key information: ${fileContent}`
              }
            ],
            temperature: aiConfig.temperature,
            max_tokens: aiConfig.maxTokens
          });

          if (!response.data?.choices?.[0]?.message?.content) {
            throw new Error('Invalid response format from OpenRouter API');
          }

          const { data: lesson, error: insertError } = await supabase
            .from('lessons')
            .insert({
              title: file.name.replace(/\.[^/.]+$/, ''),
              content: response.data.choices[0].message.content,
              user_id: user.id,
              status: 'processing'
            })
            .select()
            .single();

          if (insertError) throw insertError;
          if (!lesson) throw new Error('Failed to create lesson');

          return {
            success: true,
            data: {
              lesson_id: lesson.id,
              content: response.data.choices[0].message.content
            }
          };
        } catch (error) {
          throw error;
        }
      }, estimatedTokens);
    } catch (error) {
      return handleAIError(error);
    }
  }

  static async evaluateLesson(lessonId: string): Promise<ProcessingResult> {
    try {
      const instance = NvidiaAIProcessor.getInstance();

      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select('content')
        .eq('id', lessonId)
        .single();

      if (lessonError) throw lessonError;
      if (!lesson) throw new Error('Lesson not found');

      const estimatedTokens = Math.ceil(lesson.content.length / 4);

      return instance.executeWithRateLimit(async () => {
        const response = await instance.client.post('', {
          model: aiConfig.modelId,
          messages: [
            {
              role: 'system',
              content: 'You are an expert at evaluating educational content quality.'
            },
            {
              role: 'user',
              content: `Evaluate this lesson content and provide a quality score between 0 and 1: ${lesson.content}`
            }
          ],
          temperature: aiConfig.temperature,
          max_tokens: aiConfig.maxTokens
        });

        const content = response.data.choices[0].message.content;
        const scoreMatch = content.match(/(\d*\.)?\d+/);
        const quality_score = scoreMatch ? Math.min(Math.max(parseFloat(scoreMatch[0]), 0), 1) : 0.5;

        return {
          success: true,
          data: {
            quality_score,
            feedback: content
          }
        };
      }, estimatedTokens);
    } catch (error) {
      return handleAIError(error);
    }
  }

  static async refineLesson(lessonId: string): Promise<ProcessingResult> {
    try {
      const instance = NvidiaAIProcessor.getInstance();

      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select('content')
        .eq('id', lessonId)
        .single();

      if (lessonError) throw lessonError;
      if (!lesson) throw new Error('Lesson not found');

      const estimatedTokens = Math.ceil(lesson.content.length / 4);

      return instance.executeWithRateLimit(async () => {
        const response = await instance.client.post('', {
          model: aiConfig.modelId,
          messages: [
            {
              role: 'system',
              content: 'You are an expert at improving educational content quality.'
            },
            {
              role: 'user',
              content: `Improve this lesson content while maintaining its core message: ${lesson.content}`
            }
          ],
          temperature: aiConfig.temperature,
          max_tokens: aiConfig.maxTokens
        });

        const refinedContent = response.data.choices[0].message.content;

        const { error: updateError } = await supabase
          .from('lessons')
          .update({ 
            content: refinedContent,
            status: 'complete'
          })
          .eq('id', lessonId);

        if (updateError) throw updateError;

        return {
          success: true,
          data: {
            refined_content: refinedContent
          }
        };
      }, estimatedTokens);
    } catch (error) {
      return handleAIError(error);
    }
  }
}