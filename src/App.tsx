import React, { useEffect, useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ProcessingLog } from './components/ProcessingLog';
import { CourseList } from './components/CourseList';
import { Auth } from './components/Auth';
import { TestNvidia } from './components/TestNvidia';
import { TestAI } from './components/TestAI';
import { BookOpen, LogOut, RefreshCw } from 'lucide-react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { supabase } from './lib/supabase';
import { NvidiaAIProcessor } from './lib/nvidia';
import { useStore } from './store/useStore';

const queryClient = new QueryClient();

function GlobalRefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { addLog } = useStore();

  const handleGlobalRefresh = async () => {
    try {
      setIsRefreshing(true);
      addLog('Starting global content refresh...', 'info');

      // Get all lessons
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: lessons, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'incomplete');

      if (error) throw error;

      addLog(`Found ${lessons.length} lessons to process`, 'info');

      // Group lessons by course
      const courseMap = new Map();
      lessons.forEach(lesson => {
        const courseId = lesson.course_id;
        if (courseId) {
          if (!courseMap.has(courseId)) {
            courseMap.set(courseId, []);
          }
          courseMap.get(courseId).push(lesson);
        }
      });

      addLog(`Processing ${courseMap.size} courses`, 'info');

      // Process each course
      for (const [courseId, courseLessons] of courseMap.entries()) {
        addLog(`Processing course ${courseId} with ${courseLessons.length} lessons`, 'info');

        // Process each lesson in the course
        for (const lesson of courseLessons) {
          addLog(`Evaluating lesson: ${lesson.title}`, 'info');

          // Evaluate the lesson
          const evaluationResult = await NvidiaAIProcessor.evaluateLesson(lesson.id);
          
          if (!evaluationResult.success) {
            addLog(`Failed to evaluate lesson ${lesson.title}: ${evaluationResult.error}`, 'error');
            continue;
          }

          addLog(`Lesson ${lesson.title} evaluation complete. Quality score: ${(evaluationResult.data.quality_score * 100).toFixed(1)}%`, 'success');

          // If quality score is low, refine the lesson
          if (evaluationResult.data.quality_score < 0.7) {
            addLog(`Quality score below threshold. Refining lesson: ${lesson.title}`, 'info');
            const refinementResult = await NvidiaAIProcessor.refineLesson(lesson.id);
            
            if (!refinementResult.success) {
              addLog(`Failed to refine lesson ${lesson.title}: ${refinementResult.error}`, 'error');
            } else {
              addLog(`Successfully refined lesson: ${lesson.title}`, 'success');
            }
          }
        }

        addLog(`Architecting course structure for course ${courseId}`, 'info');

        // Architect the course structure
        const architectureResult = await NvidiaAIProcessor.architectCourse(courseId);
        
        if (!architectureResult.success) {
          addLog(`Failed to architect course ${courseId}: ${architectureResult.error}`, 'error');
        } else {
          addLog(`Successfully architected course structure`, 'success');
        }
      }

      // Refresh the data
      await queryClient.invalidateQueries({ queryKey: ['lessons'] });
      addLog('Global content refresh complete', 'success');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      addLog(`Error during global refresh: ${errorMessage}`, 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleGlobalRefresh}
      disabled={isRefreshing}
      className={`w-full mb-6 flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white ${
        isRefreshing 
          ? 'bg-gray-400 cursor-not-allowed' 
          : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
      }`}
    >
      <RefreshCw className={`h-5 w-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing All Content...' : 'Refresh All Content'}
    </button>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Auth />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <h1 className="ml-3 text-2xl font-bold text-gray-900">
                  Educational Content Processing System
                </h1>
              </div>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                  Upload Educational Content
                </h2>
                <GlobalRefreshButton />
                <FileUpload />
                <ProcessingLog />
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <TestNvidia />
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <TestAI />
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                  Your Courses
                </h2>
                <CourseList />
              </div>
            </div>
          </div>
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;