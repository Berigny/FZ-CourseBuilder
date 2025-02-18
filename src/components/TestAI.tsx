import React, { useState } from 'react';
import { testAIProvider, runAllTests } from '../services/ai/testing';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { AIServiceError } from '../services/ai/types';

interface TestResult {
  provider: string;
  success: boolean;
  message?: string;
  error?: AIServiceError;
  latency?: number;
}

export function TestAI() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async (provider?: 'nvidia' | 'openai' | 'anthropic') => {
    setIsRunning(true);
    setResults([]);
    setError(null);

    try {
      if (provider) {
        const startTime = Date.now();
        const success = await testAIProvider(provider);
        const latency = Date.now() - startTime;

        setResults([{
          provider,
          success,
          latency,
          message: success ? 'All tests passed successfully' : 'Tests failed'
        }]);
      } else {
        const startTime = Date.now();
        const allResults = await runAllTests();
        
        if (!allResults || Object.keys(allResults).length === 0) {
          throw new Error('No test results received');
        }

        const latency = Date.now() - startTime;

        const formattedResults = Object.entries(allResults).map(([provider, success]) => ({
          provider,
          success,
          latency: latency / Object.keys(allResults).length,
          message: success ? 'All tests passed successfully' : 'Tests failed'
        }));

        if (formattedResults.length === 0) {
          throw new Error('No test results to display');
        }

        setResults(formattedResults);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      setResults([]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">AI Service Tests</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => handleTest('nvidia')}
            disabled={isRunning}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <div className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing NVIDIA...
              </div>
            ) : (
              'Test NVIDIA'
            )}
          </button>
          <button
            onClick={() => handleTest()}
            disabled={isRunning}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <div className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing All...
              </div>
            ) : (
              'Test All Providers'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {results.length > 0 ? (
          results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                result.success ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div className="flex items-start">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                )}
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">
                      {result.provider.toUpperCase()} Test
                    </h3>
                    {result.latency && (
                      <span className="text-xs text-gray-500">
                        {result.latency}ms
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {result.message}
                  </p>
                  {result.error && (
                    <div className="mt-2 text-xs text-red-600">
                      <p className="font-medium">Error Details:</p>
                      <p>Code: {result.error.code}</p>
                      <p>Message: {result.error.message}</p>
                      <p>Retryable: {result.error.retryable ? 'Yes' : 'No'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : !error && !isRunning && (
          <div className="text-center text-gray-500 py-4">
            No test results yet. Click one of the buttons above to start testing.
          </div>
        )}
      </div>
    </div>
  );
}