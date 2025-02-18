export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string
          title: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      topics: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          order?: number
          created_at?: string
          updated_at?: string
        }
      }
      lessons: {
        Row: {
          id: string
          title: string
          content: string
          category: 'core' | 'supplementary' | 'exploratory'
          status: 'processing' | 'complete' | 'failed' | 'needs_refinement'
          metadata: Json
          created_at: string
          updated_at: string
          user_id: string
          course_id: string | null
        }
        Insert: {
          id?: string
          title: string
          content: string
          category?: 'core' | 'supplementary' | 'exploratory'
          status?: 'processing' | 'complete' | 'failed' | 'needs_refinement'
          metadata?: Json
          created_at?: string
          updated_at?: string
          user_id?: string
          course_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          content?: string
          category?: 'core' | 'supplementary' | 'exploratory'
          status?: 'processing' | 'complete' | 'failed' | 'needs_refinement'
          metadata?: Json
          created_at?: string
          updated_at?: string
          user_id?: string
          course_id?: string | null
        }
      }
      processing_queue: {
        Row: {
          id: string
          lesson_id: string
          status: 'pending' | 'processing' | 'complete' | 'failed'
          step: string
          error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lesson_id: string
          status?: 'pending' | 'processing' | 'complete' | 'failed'
          step: string
          error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          status?: 'pending' | 'processing' | 'complete' | 'failed'
          step?: string
          error?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}