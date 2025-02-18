import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { BookOpen, ChevronDown, ChevronRight, Clock, FileText, Tag, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { NvidiaAIProcessor as AIProcessor } from '../lib/nvidia';
import { useStore } from '../store/useStore';

type Course = Database['public']['Tables']['courses']['Row'];
type Lesson = Database['public']['Tables']['lessons']['Row'];

export function CourseList() {
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { addLog } = useStore();

  const { data: courses, isLoading: coursesLoading, error: coursesError } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get courses that have at least one completed lesson
      const { data: validCourses, error } = await supabase
        .from('courses')
        .select('*, lessons!inner(*)')
        .eq('user_id', user.id)
        .eq('lessons.status', 'complete')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Remove duplicates by title
      const uniqueCourses = validCourses.reduce((acc: Course[], current) => {
        const exists = acc.find(course => course.title === current.title);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      return uniqueCourses as Course[];
    },
  });

  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['lessons'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Only get completed lessons
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'complete')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Remove duplicate lessons by title within each course
      const uniqueLessons = data.reduce((acc: Lesson[], current) => {
        const existingLesson = acc.find(
          lesson => 
            lesson.title === current.title && 
            lesson.course_id === current.course_id
        );
        if (!existingLesson) {
          acc.push(current);
        }
        return acc;
      }, []);

      return uniqueLessons as Lesson[];
    },
  });

  const isLoading = coursesLoading || lessonsLoading;

  const handleRefresh = async (courseId: string) => {
    try {
      setRefreshing(prev => new Set(prev).add(courseId));
      addLog(`Starting refresh for course ${courseId}`, 'info');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get completed lessons for this course
      const { data: courseLessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('status', 'complete');

      if (lessonsError) throw lessonsError;

      addLog(`Found ${courseLessons?.length || 0} lessons to process`, 'info');

      // Process each lesson with improved error handling and retries
      for (const lesson of (courseLessons || [])) {
        addLog(`Evaluating lesson: ${lesson.title}`, 'info');

        // Evaluate the lesson with retries
        let evaluationResult;
        let retryCount = 0;
        const maxRetries = 3;
        const baseDelay = 2000; // 2 seconds

        while (retryCount < maxRetries) {
          try {
            evaluationResult = await AIProcessor.evaluateLesson(lesson.id);
            if (evaluationResult.success) break;
            
            retryCount++;
            if (retryCount < maxRetries) {
              const delay = baseDelay * Math.pow(2, retryCount - 1);
              addLog(`Retry ${retryCount}/${maxRetries} after ${delay}ms delay...`, 'info');
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
              throw error;
            }
            const delay = baseDelay * Math.pow(2, retryCount - 1);
            addLog(`Error occurred, retry ${retryCount}/${maxRetries} after ${delay}ms delay...`, 'error');
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        if (!evaluationResult?.success) {
          addLog(`Failed to evaluate lesson ${lesson.title}: ${evaluationResult?.error || 'Unknown error'}`, 'error');
          continue;
        }

        addLog(`Lesson ${lesson.title} evaluation complete. Quality score: ${(evaluationResult.data.quality_score * 100).toFixed(1)}%`, 'success');

        // If quality score is low, refine the lesson with retries
        if (evaluationResult.data.quality_score < 0.7) {
          addLog(`Quality score below threshold. Refining lesson: ${lesson.title}`, 'info');
          
          let refinementResult;
          retryCount = 0;

          while (retryCount < maxRetries) {
            try {
              refinementResult = await AIProcessor.refineLesson(lesson.id);
              if (refinementResult.success) break;
              
              retryCount++;
              if (retryCount < maxRetries) {
                const delay = baseDelay * Math.pow(2, retryCount - 1);
                addLog(`Retry ${retryCount}/${maxRetries} after ${delay}ms delay...`, 'info');
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            } catch (error) {
              retryCount++;
              if (retryCount === maxRetries) {
                throw error;
              }
              const delay = baseDelay * Math.pow(2, retryCount - 1);
              addLog(`Error occurred, retry ${retryCount}/${maxRetries} after ${delay}ms delay...`, 'error');
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
          
          if (!refinementResult?.success) {
            addLog(`Failed to refine lesson ${lesson.title}: ${refinementResult?.error || 'Unknown error'}`, 'error');
            continue;
          }

          addLog(`Successfully refined lesson: ${lesson.title}`, 'success');
        }
      }

      // Refresh the data
      await queryClient.invalidateQueries({ queryKey: ['courses'] });
      await queryClient.invalidateQueries({ queryKey: ['lessons'] });
      addLog(`Course refresh complete`, 'success');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error refreshing course: ${errorMessage}`, 'error');
    } finally {
      setRefreshing(prev => {
        const next = new Set(prev);
        next.delete(courseId);
        return next;
      });
    }
  };

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-gray-200 rounded-lg"></div>
        <div className="h-24 bg-gray-200 rounded-lg"></div>
        <div className="h-24 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (coursesError) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg">
        Error loading courses: {coursesError instanceof Error ? coursesError.message : 'Unknown error'}
      </div>
    );
  }

  // Create a map of lessons by course using the course_id column
  const lessonsByCourse = new Map<string, Lesson[]>();
  lessons?.forEach(lesson => {
    if (lesson.course_id) {
      if (!lessonsByCourse.has(lesson.course_id)) {
        lessonsByCourse.set(lesson.course_id, []);
      }
      lessonsByCourse.get(lesson.course_id)?.push(lesson);
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {courses?.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          No courses available. Upload content to create your first course.
        </div>
      ) : (
        courses?.map((course) => {
          const courseLessons = lessonsByCourse.get(course.id) || [];
          const isExpanded = expandedCourses.has(course.id);
          const isRefreshingCourse = refreshing.has(course.id);

          return (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{course.title}</h3>
                      {course.description && (
                        <p className="text-sm text-gray-500">{course.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center">
                          <FileText className="h-4 w-4 mr-1" />
                          {courseLessons.length} lessons
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          Updated {formatDate(course.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleRefresh(course.id)}
                      disabled={isRefreshingCourse}
                      className={`p-2 rounded-md transition-colors ${
                        isRefreshingCourse
                          ? 'bg-gray-100 cursor-not-allowed'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <RefreshCw className={`h-5 w-5 text-gray-500 ${
                        isRefreshingCourse ? 'animate-spin' : ''
                      }`} />
                    </button>
                    <button
                      onClick={() => toggleCourse(course.id)}
                      className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && courseLessons.length > 0 && (
                <div className="border-t">
                  <div className="p-6 space-y-8">
                    {courseLessons.map((lesson) => (
                      <div key={lesson.id} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-800 flex items-center">
                            {lesson.title}
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Tag className="h-3 w-3 mr-1" />
                              {lesson.category}
                            </span>
                          </h4>
                          <span className="text-sm text-gray-500">
                            {formatDate(lesson.created_at)}
                          </span>
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{lesson.content}</ReactMarkdown>
                        </div>
                        {lesson.metadata?.evaluation_results && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">
                              Evaluation Results
                            </h5>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Quality Score</p>
                                <p className="text-lg font-medium text-gray-900">
                                  {(lesson.metadata.evaluation_results.quality_score * 100).toFixed(0)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Status</p>
                                <p className="text-lg font-medium text-gray-900 capitalize">
                                  {lesson.status.replace('_', ' ')}
                                </p>
                              </div>
                            </div>
                            {lesson.metadata.evaluation_results.feedback && (
                              <div className="mt-4">
                                <p className="text-sm text-gray-600">Feedback</p>
                                <p className="text-sm text-gray-800 mt-1">
                                  {lesson.metadata.evaluation_results.feedback}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}