import { create } from 'zustand';
import { AIProcessor } from '../lib/aiProcessor';
import { supabase } from '../lib/supabase';

interface Log {
  message: string;
  timestamp: string;
  type?: 'info' | 'error' | 'success' | 'agent';
  agent?: string;
  model?: string;
}

interface ProcessingState {
  currentFile: File | null;
  processingStatus: 'idle' | 'uploading' | 'processing' | 'evaluating' | 'refining' | 'complete' | 'error';
  logs: Log[];
  currentLessonId: string | null;
  error: string | null;
  setCurrentFile: (file: File | null) => void;
  setProcessingStatus: (status: ProcessingState['processingStatus']) => void;
  addLog: (message: string, type?: 'info' | 'error' | 'success' | 'agent', agent?: string, model?: string) => void;
  clearLogs: () => void;
  setError: (error: string | null) => void;
  processFile: (file: File) => Promise<void>;
}

export const useStore = create<ProcessingState>((set, get) => ({
  currentFile: null,
  processingStatus: 'idle',
  logs: [],
  currentLessonId: null,
  error: null,

  setCurrentFile: (file) => set({ currentFile: file }),
  setProcessingStatus: (status) => set({ processingStatus: status }),
  setError: (error) => set({ error }),
  
  addLog: (message, type = 'info', agent?: string, model?: string) =>
    set((state) => ({
      logs: [
        ...state.logs,
        { 
          message, 
          timestamp: new Date().toISOString(), 
          type,
          agent,
          model
        },
      ],
    })),
    
  clearLogs: () => set({ logs: [] }),

  processFile: async (file: File) => {
    const { addLog, setProcessingStatus, setError } = get();
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Please sign in to process documents');
      }

      setError(null);
      setProcessingStatus('uploading');
      addLog('Starting file upload and processing...', 'info');

      // Process document
      const processResult = await AIProcessor.processDocument(file);
      if (!processResult.success) {
        throw new Error(processResult.error || 'Document processing failed');
      }

      setProcessingStatus('processing');
      addLog(
        'Document processed successfully. Starting lesson evaluation...', 
        'success',
        'Architect Agent',
        'OpenRouter'
      );

      // Evaluate lesson
      const lessonId = processResult.data?.lesson_id;
      if (!lessonId) {
        throw new Error('No lesson ID received from document processing');
      }

      set({ currentLessonId: lessonId });
      
      const evaluationResult = await AIProcessor.evaluateLesson(lessonId);
      if (!evaluationResult.success) {
        throw new Error(evaluationResult.error || 'Lesson evaluation failed');
      }

      const qualityScore = evaluationResult.data?.quality_score;
      if (typeof qualityScore !== 'number') {
        throw new Error('Invalid quality score received from evaluation');
      }

      addLog(
        `Lesson evaluated. Quality score: ${qualityScore.toFixed(2)}`,
        'success',
        'Content Evaluator Agent',
        'OpenRouter'
      );

      // Refine if needed
      if (qualityScore < 0.7) {
        setProcessingStatus('refining');
        addLog(
          'Quality score below threshold. Starting lesson refinement...',
          'info',
          'Innovator Agent',
          'OpenRouter'
        );
        
        const refinementResult = await AIProcessor.refineLesson(lessonId);
        if (!refinementResult.success) {
          throw new Error(refinementResult.error || 'Lesson refinement failed');
        }
        
        addLog(
          'Lesson refinement complete.',
          'success',
          'Innovator Agent',
          'OpenRouter'
        );
      }

      setProcessingStatus('complete');
      addLog(
        'Processing completed successfully!',
        'success',
        'Publisher Agent',
        'OpenRouter'
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setProcessingStatus('error');
      setError(errorMessage);
      addLog(`Error: ${errorMessage}`, 'error');
      
      // Clear current lesson ID if there was an error
      set({ currentLessonId: null });
    }
  },
}));