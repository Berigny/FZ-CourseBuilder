import { aiConfig, timeoutConfig } from '../config/aiConfig'; // ✅ Fixed Import Path
import { supabase } from './supabase';
import axios, { AxiosError, AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { rateLimiter } from '../services/ai/rateLimit';
import { handleAIError } from '../services/ai/errorHandler';
import { aiMonitoring } from '../services/ai/monitoring';

console.log("🔍 OpenRouter API Key:", aiConfig.apiKey);
console.log("🔍 OpenRouter API Endpoint:", aiConfig.apiEndpoint);
console.log("🔍 OpenRouter Model ID:", aiConfig.modelId);

interface ProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
}

console.log("🔍 OpenRouter API Key:", aiConfig.apiKey);
console.log("🔍 OpenRouter API Endpoint:", aiConfig.apiEndpoint);
console.log("🔍 OpenRouter Model ID:", aiConfig.modelId);


export class AIProcessor {
  private static instance: AIProcessor;
  private client: AxiosInstance;

  private constructor() {
    if (!aiConfig.apiKey || !aiConfig.apiEndpoint || !aiConfig.modelId) {
      throw new Error('Missing required OpenRouter configuration');
    }
  
    // 🔍 Debugging: Log environment variables to check if they are correctly loaded
    console.log("🔍 OpenRouter API Key:", aiConfig.apiKey);
    //console.log("🔍 OpenRouter API Endpoint:", aiConfig.apiEndpoint);
    console.log("🔍 OpenRouter Model ID:", aiConfig.modelId);
  
    // ✅ Fix: Ensure full API path is set correctly
    this.client = axios.create({
      baseURL: ``,  // 
      headers: {
        'Authorization': `Bearer ${aiConfig.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://starlit-torrone-f24099.netlify.app',
        'X-Title': 'Educational Content Processing System'
      },
      timeout: timeoutConfig.request,
      validateStatus: (status) => status >= 200 && status < 300
    });
  
    axiosRetry(this.client, {
      retries: aiConfig.retry.count,
      retryDelay: (retryCount) => {
        const delay = Math.min(
          aiConfig.retry.delay * Math.pow(2, retryCount - 1),
          aiConfig.retry.maxDelay
        );
        return delay;
      },
      retryCondition: (error: AxiosError) => {
        if (!error.response) return true;
        const status = error.response.status;
        return status === 429 || status >= 500 && status <= 599;
      }
    });
  }

  static getInstance(): AIProcessor {
    if (!AIProcessor.instance) {
      AIProcessor.instance = new AIProcessor();
    }
    return AIProcessor.instance;
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
        console.log('No permit available, queueing request');
        return rateLimiter.enqueue(operation);
      }

      console.log('Executing operation with permit');
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
        console.log('Releasing permit');
        rateLimiter.releasePermit(estimatedTokens);
      }
    }
  }

  static async processDocument(file: File): Promise<ProcessingResult> {
    try {
      const instance = AIProcessor.getInstance();
      const estimatedTokens = Math.ceil(file.size / 4);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      // Read file content as text
      const fileContent = await file.text();
      if (!fileContent.trim()) {
        throw new Error('Empty or invalid file content');
      }

      return instance.executeWithRateLimit(async () => {
        try {
          console.log('Sending document processing request');
          const response = await instance.client.post('', {
            model: aiConfig.modelId,
            messages: [
              {
                role: 'system',
                content: 'You are an expert at processing educational content and extracting structured information. Always respond with well-structured content including a title, sections, and key points.'
              },
              {
                role: 'user',
                content: `Process this educational document and extract key information in a structured format with clear sections and subsections: ${fileContent}`
              }
            ],
            temperature: aiConfig.temperature,
            max_tokens: aiConfig.maxTokens
          });

          if (!response.data?.choices?.[0]?.message?.content) {
            throw new Error('Invalid response format from OpenRouter API');
          }

          // Create a new lesson in the database
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

          console.log('Document processing successful');
          return {
            success: true,
            data: {
              lesson_id: lesson.id,
              content: response.data.choices[0].message.content
            }
          };
        } catch (error) {
          console.error('Document processing failed:', error);
          throw error;
        }
      }, estimatedTokens);
    } catch (error) {
      return handleAIError(error);
    }
  }

  static async evaluateLesson(lessonId: string): Promise<ProcessingResult> {
    try {
      const instance = AIProcessor.getInstance();

      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select('content')
        .eq('id', lessonId)
        .single();

      if (lessonError) throw lessonError;
      if (!lesson) throw new Error('Lesson not found');

      const estimatedTokens = Math.ceil(lesson.content.length / 4);

      return instance.executeWithRateLimit(async () => {
        console.log('Sending lesson evaluation request');
        const response = await instance.client.post('', {
          model: aiConfig.modelId,
          messages: [
            {
              role: 'system',
              content: 'You are an expert at evaluating educational content quality. Analyze the content and provide a quality score between 0 and 1, along with detailed feedback.'
            },
            {
              role: 'user',
              content: `Evaluate this lesson content and provide a quality assessment: ${lesson.content}`
            }
          ],
          temperature: aiConfig.temperature,
          max_tokens: aiConfig.maxTokens
        });

        if (!response.data?.choices?.[0]?.message?.content) {
          throw new Error('Invalid response format from OpenRouter API');
        }

        // Extract quality score from response
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
      const instance = AIProcessor.getInstance();

      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select('content')
        .eq('id', lessonId)
        .single();

      if (lessonError) throw lessonError;
      if (!lesson) throw new Error('Lesson not found');

      const estimatedTokens = Math.ceil(lesson.content.length / 4);

      return instance.executeWithRateLimit(async () => {
        console.log('Sending lesson refinement request');
        const response = await instance.client.post('', {
          model: aiConfig.modelId,
          messages: [
            {
              role: 'system',
              content: 'You are an expert at improving educational content quality. Enhance the content while maintaining its core message and structure. Focus on clarity, engagement, and educational value.'
            },
            {
              role: 'user',
              content: `Improve this lesson content while maintaining its core message and structure: ${lesson.content}`
            }
          ],
          temperature: aiConfig.temperature,
          max_tokens: aiConfig.maxTokens
        });

        if (!response.data?.choices?.[0]?.message?.content) {
          throw new Error('Invalid response format from OpenRouter API');
        }

        const refinedContent = response.data.choices[0].message.content;

        // Update the lesson with refined content
        const { error: updateError } = await supabase
          .from('lessons')
          .update({ 
            content: refinedContent,
            status: 'complete'
          })
          .eq('id', lessonId);

        if (updateError) throw updateError;

        console.log('Lesson refinement successful');
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