import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export function FileUpload() {
  const { processFile, processingStatus, addLog } = useStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      addLog(`File selected: ${file.name}`);
      await processFile(file);
    }
  }, [processFile, addLog]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
    disabled: processingStatus !== 'idle',
  });

  const isProcessing = processingStatus !== 'idle' && processingStatus !== 'complete' && processingStatus !== 'error';

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      {isProcessing ? (
        <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
      ) : (
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
      )}
      <p className="mt-4 text-lg text-gray-600">
        {isProcessing
          ? `Processing: ${processingStatus}...`
          : isDragActive
          ? "Drop the file here..."
          : "Drag 'n' drop a file here, or click to select"}
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Supports PDF, DOC, and DOCX files
      </p>
    </div>
  );
}