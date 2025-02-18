import React, { useState } from 'react';
import { AIProcessor } from '../lib/ai';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
}

export function TestNvidia() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
    // Add console logging for debugging
    console.log(`Test Result [${result.step}]:`, {
      success: result.success,
      message: result.message,
      data: result.data
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Test API connectivity first
      addResult({
        step: 'API Connectivity',
        success: true,
        message: 'Testing API connectivity...'
      });

      // Create a minimal test document
      const sampleText = 'This is a test document for educational content processing.';
      const sampleFile = new File([sampleText], 'test.pdf', { type: 'application/pdf' });

      // Test document processing with retries
      let processResult;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          console.log('Attempting document processing...'); // Debug log
          processResult = await AIProcessor.processDocument(sampleFile);
          console.log('Raw process result:', JSON.stringify(processResult, null, 2)); // Debug log
          break;
        } catch (error) {
          retryCount++;
          console.error(`Processing attempt ${retryCount} failed:`, error); // Debug log
          if (retryCount === maxRetries) {
            throw error;
          }
          addResult({
            step: 'Document Processing',
            success: false,
            message: `Retry ${retryCount}/${maxRetries}: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        }
      }

      if (!processResult?.success) {
        throw new Error(processResult?.error || 'Document processing failed');
      }

      addResult({
        step: 'Document Processing',
        success: true,
        message: 'Document processed successfully',
        data: processResult.data
      });

      if (processResult.data?.lesson_id) {
        // Test lesson evaluation with retries
        let evaluationResult;
        retryCount = 0;

        while (retryCount < maxRetries) {
          try {
            console.log('Attempting lesson evaluation...'); // Debug log
            evaluationResult = await AIProcessor.evaluateLesson(processResult.data.lesson_id);
            console.log('Raw evaluation result:', JSON.stringify(evaluationResult, null, 2)); // Debug log
            break;
          } catch (error) {
            retryCount++;
            console.error(`Evaluation attempt ${retryCount} failed:`, error); // Debug log
            if (retryCount === maxRetries) {
              throw error;
            }
            addResult({
              step: 'Lesson Evaluation',
              success: false,
              message: `Retry ${retryCount}/${maxRetries}: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
          }
        }

        if (!evaluationResult?.success) {
          throw new Error(evaluationResult?.error || 'Lesson evaluation failed');
        }

        addResult({
          step: 'Lesson Evaluation',
          success: true,
          message: 'Lesson evaluated successfully',
          data: evaluationResult.data
        });

        // Test lesson refinement if quality score is low
        if (evaluationResult.data?.quality_score < 0.7) {
          let refinementResult;
          retryCount = 0;

          while (retryCount < maxRetries) {
            try {
              console.log('Attempting lesson refinement...'); // Debug log
              refinementResult = await AIProcessor.refineLesson(processResult.data.lesson_id);
              console.log('Raw refinement result:', JSON.stringify(refinementResult, null, 2)); // Debug log
              break;
            } catch (error) {
              retryCount++;
              console.error(`Refinement attempt ${retryCount} failed:`, error); // Debug log
              if (retryCount === maxRetries) {
                throw error;
              }
              addResult({
                step: 'Lesson Refinement',
                success: false,
                message: `Retry ${retryCount}/${maxRetries}: ${error instanceof Error ? error.message : 'Unknown error'}`
              });
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            }
          }

          if (!refinementResult?.success) {
            throw new Error(refinementResult?.error || 'Lesson refinement failed');
          }

          addResult({
            step: 'Lesson Refinement',
            success: true,
            message: 'Lesson refined successfully',
            data: refinementResult.data
          });
        }
      }
    } catch (error) {
      console.error('Test failed with error:', error); // Debug log
      addResult({
        step: 'Error',
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">AI Integration Tests</h2>
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`px-4 py-2 rounded-md text-white ${
            isRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isRunning ? (
            <div className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Tests...
            </div>
          ) : (
            'Run Tests'
          )}
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${
              result.success ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <div className="flex items-start">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              )}
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-900">
                  {result.step}
                </h3>
                <p className="mt-1 text-sm text-gray-600">{result.message}</p>
                {result.data && (
                  <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}