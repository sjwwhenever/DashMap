'use client';

import React, { useState } from 'react';
import VideoUpload from '@/components/VideoUpload';
import { VideoUploadResponse, VideoTranscriptionResponse } from '@/types/memories';

export default function HomePage() {
  const [uploadResults, setUploadResults] = useState<VideoUploadResponse[]>([]);
  const [transcriptions, setTranscriptions] = useState<{[videoNo: string]: VideoTranscriptionResponse}>({});
  const [processingStatus, setProcessingStatus] = useState<{[videoNo: string]: string}>({});
  const [showApiInfo, setShowApiInfo] = useState(false);

  const handleUploadComplete = (result: VideoUploadResponse) => {
    setUploadResults(prev => [...prev, result]);
    console.log('Upload completed:', result);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  const handleUploadProgress = (progress: any) => {
    console.log('Upload progress:', progress);
  };

  const handleTranscriptionComplete = (transcription: VideoTranscriptionResponse) => {
    console.log('Transcription completed:', transcription);
    setTranscriptions(prev => ({
      ...prev,
      [transcription.data.videoNo]: transcription
    }));
  };

  const handleTranscriptionError = (error: string) => {
    console.error('Transcription error:', error);
  };

  const handleProcessingStatusChange = (status: string) => {
    console.log('Processing status changed:', status);
    // For now, we'll track overall status. In a real app, you might want to track per video
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Memories.ai Video Upload Test
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/conversation"
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Conversations
              </a>
              <button
                onClick={() => setShowApiInfo(!showApiInfo)}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                API Info
              </button>
              <a
                href="https://memories.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                memories.ai →
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* API Information Panel */}
      {showApiInfo && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                API Configuration
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Environment Variables</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li><code className="bg-gray-100 px-2 py-1 rounded">NEXT_PUBLIC_MEMORIES_API_URL</code></li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">MEMORIES_API_KEY</code></li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">NEXT_PUBLIC_MAVI_API_URL</code></li>
                    <li><code className="bg-gray-100 px-2 py-1 rounded">MAVI_API_KEY</code></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Current Configuration</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>API URL: {process.env.NEXT_PUBLIC_MEMORIES_API_URL || 'https://api.memories.ai'}</li>
                    <li>API Key: {process.env.MEMORIES_API_KEY ? '••••••••' : 'Not configured'}</li>
                    <li>Timeout: 30 seconds</li>
                    <li>Max File Size: 500MB</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Copy <code>.env.local.example</code> to <code>.env.local</code> and add your API keys to test with the real API.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Video Upload Component */}
        <VideoUpload
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          onUploadProgress={handleUploadProgress}
          onTranscriptionComplete={handleTranscriptionComplete}
          onTranscriptionError={handleTranscriptionError}
          onProcessingStatusChange={handleProcessingStatusChange}
          multiple={true}
          maxFileSize={500 * 1024 * 1024} // 500MB
          autoTranscribe={true}
        />

        {/* Upload Results */}
        {uploadResults.length > 0 && (
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Upload History ({uploadResults.length})
                </h3>
                
                <div className="space-y-4">
                  {uploadResults.map((result, index) => {
                    const videoNo = result.data?.videoNo;
                    const transcription = videoNo ? transcriptions[videoNo] : null;
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {result.data?.videoName || `Video ${index + 1}`}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Video ID: <code className="bg-gray-100 px-1 rounded">{videoNo || 'N/A'}</code>
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            result.data?.videoStatus === 'PARSE' ? 'bg-green-100 text-green-800' :
                            result.data?.videoStatus === 'UNPARSE' ? 'bg-yellow-100 text-yellow-800' :
                            result.data?.videoStatus === 'FAIL' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.data?.videoStatus || 'Unknown'}
                          </span>
                        </div>
                        
                        <div className="mt-2 space-y-2">
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Upload Status:</span>
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${
                              result.code === '0000' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {result.msg || 'Unknown'}
                            </span>
                          </div>
                          
                          {result.data?.uploadTime && (
                            <p className="text-sm text-gray-600">
                              Upload Time: {new Date(parseInt(result.data.uploadTime)).toLocaleString()}
                            </p>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setUploadResults([])}
                    className="px-4 py-2 text-sm text-red-600 hover:text-red-800 transition-colors"
                  >
                    Clear History
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>
              Built with Next.js and TypeScript for testing{' '}
              <a href="https://memories.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                Memories.ai
              </a>{' '}
              video upload functionality.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}