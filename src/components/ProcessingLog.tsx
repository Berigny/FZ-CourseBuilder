import React from 'react';
import { ScrollText, AlertCircle, CheckCircle, Info, Bot, Cpu } from 'lucide-react';
import { useStore } from '../store/useStore';

export function ProcessingLog() {
  const { logs, error } = useStore();

  const getIcon = (type?: 'info' | 'error' | 'success' | 'agent') => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />;
      case 'agent':
        return <Bot className="h-4 w-4 text-blue-500 flex-shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />;
    }
  };

  const getMessageClass = (type?: 'info' | 'error' | 'success' | 'agent') => {
    switch (type) {
      case 'error':
        return 'text-red-700';
      case 'success':
        return 'text-green-700';
      case 'agent':
        return 'text-blue-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-8">
      <div className="flex items-center mb-4">
        <ScrollText className="h-5 w-5 text-gray-500 mr-2" />
        <h2 className="text-lg font-semibold text-gray-700">Processing Log</h2>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Processing Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="h-96 overflow-y-auto bg-white rounded border border-gray-200 p-4">
        {logs.length === 0 ? (
          <p className="text-gray-500 text-center">No processing logs yet</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-3">
              <div className="flex items-start">
                <div className="mr-2 mt-1">{getIcon(log.type)}</div>
                <div className="flex-1">
                  <span className="text-gray-400 text-xs">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`ml-2 text-sm ${getMessageClass(log.type)}`}>
                    {log.message}
                  </span>
                  {log.agent && (
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <Bot className="h-3 w-3 mr-1" />
                      <span className="font-medium text-blue-600">{log.agent}</span>
                      {log.model && (
                        <>
                          <Cpu className="h-3 w-3 mx-1" />
                          <span className="text-purple-600">{log.model}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}