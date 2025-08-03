'use client';

import React, { useState } from 'react';
import VideoUpload from '@/components/VideoUpload';
import EmergencyResponse from '@/components/EmergencyResponse';
import DashMapHeader from '@/components/DashMapHeader';
import DashMapFooter from '@/components/DashMapFooter';
import { VideoUploadResponse, VideoTranscriptionResponse, VideoChatMessage } from '@/types/memories';
import { useTheme } from '@/contexts/ThemeContext';

export default function HomePage() {
  const { colors } = useTheme();
  const [uploadResults, setUploadResults] = useState<VideoUploadResponse[]>([]);
  const [transcriptions, setTranscriptions] = useState<{[videoNo: string]: VideoTranscriptionResponse}>({});
  const [processingStatus, setProcessingStatus] = useState<{[videoNo: string]: string}>({});
  const [chatMessages, setChatMessages] = useState<VideoChatMessage[]>([]);
  const [analysisReport, setAnalysisReport] = useState<string>('');

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

  const handleChatMessage = (message: VideoChatMessage) => {
    console.log('Chat message received:', message);
    setChatMessages(prev => [...prev, message]);
    
    // Extract content messages for the emergency report
    if (message.type === 'content') {
      setAnalysisReport(prev => prev + '\n\n' + message.content);
    }
  };

  const handleChatComplete = () => {
    console.log('Chat completed');
  };

  const handleChatError = (error: string) => {
    console.error('Chat error:', error);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashMapHeader />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Video Upload Component - Takes up 3/4 of the width */}
          <div className="lg:col-span-3">
            <VideoUpload
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              onUploadProgress={handleUploadProgress}
              onTranscriptionComplete={handleTranscriptionComplete}
              onTranscriptionError={handleTranscriptionError}
              onProcessingStatusChange={handleProcessingStatusChange}
              onChatMessage={handleChatMessage}
              onChatComplete={handleChatComplete}
              onChatError={handleChatError}
              multiple={true}
              maxFileSize={500 * 1024 * 1024} // 500MB
              autoTranscribe={true}
            />
          </div>

          {/* Upload Results & Emergency Response - Takes up 1/4 of the width */}
          <div className="lg:col-span-1 space-y-6">
            {uploadResults.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden sticky top-8">
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Upload History ({uploadResults.length})
                  </h3>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {uploadResults.map((result, index) => {
                      const videoNo = result.data?.videoNo;
                      const transcription = videoNo ? transcriptions[videoNo] : null;
                      
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-3 text-sm">
                          <div className="mb-2">
                            <h4 className="font-medium text-gray-900 text-xs truncate">
                              {result.data?.videoName || `Video ${index + 1}`}
                            </h4>
                            <p className="text-xs text-gray-600 truncate">
                              ID: <code className="bg-gray-100 px-1 rounded text-xs">{videoNo || 'N/A'}</code>
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
                          
                          <div className="mt-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              result.code === '0000' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {result.msg || 'Unknown'}
                            </span>
                          </div>
                          
                          {result.data?.uploadTime && (
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(parseInt(result.data.uploadTime)).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => setUploadResults([])}
                      className="px-3 py-1 text-xs text-red-600 hover:text-red-800 transition-colors"
                    >
                      Clear History
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Emergency Response Component */}
            <div className="sticky top-8">
              <EmergencyResponse accidentReport={analysisReport.trim()} />
            </div>
          </div>
        </div>
    
      </main>

      <DashMapFooter />
    </div>
  );
}