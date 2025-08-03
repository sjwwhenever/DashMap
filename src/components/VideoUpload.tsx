'use client';

import React, { useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { VideoUploadProps, VideoPreview, VideoChatMessage } from '@/types/memories';
import { formatFileSize } from '@/lib/memories-api';
import { DEFAULT_VIDEO_REPORT_PROMPT } from '@/constants/reportPrompts';

const VideoUpload: React.FC<VideoUploadProps> = ({
  onUploadComplete,
  onUploadError,
  onUploadProgress,
  onTranscriptionComplete,
  onTranscriptionError,
  onProcessingStatusChange,
  onChatMessage,
  onChatComplete,
  onChatError,
  acceptedFormats = ['video/*'],
  maxFileSize = 500 * 1024 * 1024, // 500MB
  multiple = false,
  autoTranscribe = true,
  autoGenerateReport = true,
  defaultReportPrompt = DEFAULT_VIDEO_REPORT_PROMPT,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMetadata, setUploadMetadata] = useState<{
    title: string;
    description: string;
    tags: string;
  }>({
    title: '',
    description: '',
    tags: '',
  });

  const [customPrompt, setCustomPrompt] = useState(defaultReportPrompt);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const {
    uploadState,
    transcriptionState,
    chatState,
    previews,
    dragState,
    uploadVideo,
    generateReport,
    removePreview,
    clearPreviews,
    resetUpload,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    isUploading,
    progress,
    error,
    result,
    isDragging,
    hasFiles,
    isProcessing,
    transcription,
    transcriptionError,
    processingStatus,
    isGeneratingReport,
    chatMessages,
    chatSessionId,
    chatError,
    isChatComplete,
  } = useVideoUpload({
    onUploadComplete,
    onUploadError,
    onUploadProgress,
    onTranscriptionComplete,
    onTranscriptionError,
    onProcessingStatusChange,
    onChatMessage,
    onChatComplete,
    onChatError,
    maxFileSize,
    autoTranscribe,
    autoGenerateReport,
    defaultReportPrompt,
  });

  // Auto-scroll to latest messages during generation
  useEffect(() => {
    if (isGeneratingReport && chatMessagesRef.current) {
      chatMessagesRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end' 
      });
    }
  }, [chatMessages.length, isGeneratingReport]);

  const handleUploadClick = () => {
    if (previews.length > 0) {
      const tags = uploadMetadata.tags
        ? uploadMetadata.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : undefined;
      
      uploadVideo(
        previews[0].file,
        uploadMetadata.title || undefined,
        uploadMetadata.description || undefined,
        tags
      );
    }
  };

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const handleGenerateReport = () => {
    if (result?.data?.videoNo) {
      generateReport([result.data.videoNo], customPrompt, chatSessionId || undefined);
    }
  };

  const renderProgressBar = () => {
    if (!progress) return null;

    return (
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress.percentage}%` }}
        />
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>{progress.percentage}%</span>
          <span>
            {formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}
          </span>
        </div>
      </div>
    );
  };

  const renderVideoPreview = (preview: VideoPreview, index: number) => (
    <div key={index} className="bg-gray-50 p-4 rounded-lg border">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 truncate">{preview.name}</h4>
          <p className="text-sm text-gray-500">
            {formatFileSize(preview.size)} • {preview.type}
          </p>
        </div>
        <button
          onClick={() => removePreview(index)}
          className="ml-3 text-red-500 hover:text-red-700 transition-colors"
          disabled={isUploading}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="flex justify-center">
        <video
          src={preview.url}
          className="max-w-full h-48 object-contain rounded-md bg-gray-200"
          controls={false}
          muted
          preload="metadata"
        />
      </div>
    </div>
  );

  const renderChatMessage = (message: VideoChatMessage, index: number) => {
    switch (message.type) {
      case 'thinking':
        return (
          <div key={index} className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-blue-400 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <h5 className="text-blue-800 font-medium">{message.title}</h5>
            </div>
          </div>
        );
        
      case 'ref':
        return (
          <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-3">
            <h5 className="text-yellow-800 font-medium mb-2">📎 Video References</h5>
            {message.ref.map((ref, refIndex) => (
              <div key={refIndex} className="mb-3">
                <div className="text-sm text-yellow-700 font-medium mb-1">
                  {ref.video.video_name} (Duration: {ref.video.duration}s)
                </div>
                {ref.refItems.map((item, itemIndex) => (
                  <div key={itemIndex} className="ml-4 text-xs text-yellow-600 mb-1">
                    <span className="font-mono bg-yellow-100 px-1 rounded">
                      {item.startTime}s{item.endTime ? `-${item.endTime}s` : ''} ({item.type})
                    </span>
                    {item.text && <p className="mt-1 text-yellow-700">{item.text}</p>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
        
      case 'content':
        return (
          <div key={index} className="bg-green-50 border border-green-200 rounded-md p-4 mb-3">
            <div className="flex items-center mb-2">
              {isGeneratingReport ? (
                <svg className="w-4 h-4 text-green-400 mr-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <h5 className="text-green-800 font-medium">
                {isGeneratingReport ? 'Generating Analysis...' : 'Analysis Complete'}
              </h5>
            </div>
            
            <div className="prose prose-sm prose-green max-w-none text-green-700">
              <ReactMarkdown 
                components={{
                  h1: ({children}) => <h1 className="text-2xl font-bold text-green-900 mb-4 border-b-2 border-green-300 pb-2">{children}</h1>,
                  h2: ({children}) => <h2 className="text-xl font-bold text-green-900 mb-3 mt-6">{children}</h2>,
                  h3: ({children}) => <h3 className="text-lg font-semibold text-green-800 mb-2 mt-4">{children}</h3>,
                  h4: ({children}) => <h4 className="text-base font-semibold text-green-800 mb-2 mt-3">{children}</h4>,
                  p: ({children}) => <p className="text-green-700 mb-3 leading-relaxed">{children}</p>,
                  strong: ({children}) => <strong className="font-bold text-green-900 bg-green-50 px-1 rounded">{children}</strong>,
                  em: ({children}) => <em className="italic text-green-600 font-medium">{children}</em>,
                  ul: ({children}) => <ul className="list-disc ml-6 mb-4 text-green-700 space-y-2">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal ml-6 mb-4 text-green-700 space-y-2">{children}</ol>,
                  li: ({children}) => <li className="text-green-700 leading-relaxed">{children}</li>,
                  code: ({children}) => <code className="bg-green-200 text-green-900 px-2 py-1 rounded font-mono text-sm border border-green-300">{children}</code>,
                  pre: ({children}) => <pre className="bg-green-100 text-green-900 p-4 rounded-lg text-sm font-mono overflow-x-auto mb-4 border-l-4 border-green-400 shadow-sm">{children}</pre>,
                  blockquote: ({children}) => <blockquote className="border-l-4 border-green-400 pl-6 py-2 italic text-green-600 mb-4 bg-green-50 rounded-r-md">{children}</blockquote>,
                  hr: () => <hr className="border-green-300 my-6" />,
                  a: ({children, href}) => <a href={href} className="text-green-600 underline hover:text-green-800 font-medium">{children}</a>,
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isGeneratingReport && (
                <span className="inline-block w-2 h-4 bg-green-400 ml-1 animate-pulse"></span>
              )}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const renderUploadArea = () => (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
        ${isDragging 
          ? 'border-blue-500 bg-blue-50 scale-105' 
          : 'border-gray-300 hover:border-gray-400'
        }
        ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
      `}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleSelectFiles}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple={false}
        accept={acceptedFormats.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
      
      <div className="flex flex-col items-center">
        <svg
          className={`w-12 h-12 mb-4 transition-colors ${
            isDragging ? 'text-blue-500' : 'text-gray-400'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isDragging ? 'Drop videos here' : 'Upload your videos'}
        </h3>
        
        <p className="text-gray-500 mb-4">
          Drag and drop video files here, or click to browse
        </p>
        
        <p className="text-xs text-gray-400">
          Supports MP4, MOV, AVI, WebM, OGG (max {formatFileSize(maxFileSize)})
        </p>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Upload Emergency Videos
          </h2>

          {/* Upload Area */}
          {!hasFiles && renderUploadArea()}

          {/* Video Previews */}
          {hasFiles && (
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Selected Videos ({previews.length})
                </h3>
                <button
                  onClick={clearPreviews}
                  className="text-red-500 hover:text-red-700 transition-colors"
                  disabled={isUploading}
                >
                  Clear All
                </button>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                {previews.map(renderVideoPreview)}
              </div>
              
            </div>
          )}


          {/* Progress Bar */}
          {isUploading && renderProgressBar()}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-400 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <div>
                  <p className="text-blue-700 font-medium">
                    {processingStatus === 'processing' && 'Processing video...'}
                    {processingStatus === 'transcribing' && 'Getting transcription...'}
                    {processingStatus === 'completed' && 'Processing complete!'}
                  </p>
                  <p className="text-blue-600 text-sm mt-1">
                    {processingStatus === 'processing' && 'Video is being processed on Memories.ai servers. This typically takes 15 to 20 seconds.'}
                    {processingStatus === 'transcribing' && 'Processing complete! Now fetching transcription...'}
                    {processingStatus === 'completed' && 'All done! Check the results below.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Transcription Error */}
          {transcriptionError && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-orange-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-orange-700 font-medium">Transcription Error</p>
                  <p className="text-orange-600 text-sm mt-1">{transcriptionError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-green-700 font-medium">Upload successful!</p>
                  <p className="text-green-600 text-sm mt-1">
                    Video ID: <code className="bg-green-100 px-1 rounded">{result.data?.videoNo || 'N/A'}</code>
                  </p>
                  <p className="text-green-600 text-sm">
                    Status: {result.data?.videoStatus || 'Unknown'}
                  </p>
                  {autoTranscribe && (
                    <p className="text-green-600 text-sm">
                      {isProcessing ? 'Processing for transcription...' : 'Transcription will be available after processing.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transcription Results */}
          {transcription && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
              <h4 className="text-gray-900 font-medium mb-3">Transcription Results</h4>
              <div className="space-y-3">
                {transcription.data.transcriptions.map((segment, index) => (
                  <div key={index} className="bg-white rounded p-3 border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500">
                        {segment.startTime}s - {segment.endTime}s
                      </span>
                      <span className="text-xs text-gray-500">
                        Segment {segment.index + 1}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">{segment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report Generation Section */}
          {transcription && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-6">
              <h4 className="text-purple-900 font-medium mb-4">📊 Video Analysis & Report Generation</h4>
              
              {/* Custom Prompt Input - Only show when auto-generation is disabled */}
              {!autoGenerateReport && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-purple-700 mb-2">
                    Analysis Prompt
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Describe what kind of analysis you want for this video..."
                    disabled={isGeneratingReport}
                  />
                </div>
              )}

              {/* Generate Report Button - Only show when auto-generation is disabled */}
              {!autoGenerateReport && (
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-purple-600">Manual generation</span>
                  <button
                    onClick={handleGenerateReport}
                    disabled={isGeneratingReport || !result?.data?.videoNo}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      isGeneratingReport || !result?.data?.videoNo
                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                  </button>
                </div>
              )}

              {/* Auto-generation status */}
              {autoGenerateReport && (
                <div className="mb-4 p-3 bg-purple-100 border border-purple-200 rounded-md">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-sm text-purple-700">
                      Auto-analysis is enabled - Report will be generated automatically after transcription
                    </span>
                  </div>
                </div>
              )}

              {/* Chat Error */}
              {chatError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-red-700 font-medium">Report Generation Error</p>
                      <p className="text-red-600 text-sm mt-1">{chatError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Messages (Streaming Analysis) */}
              {chatMessages.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-purple-800 font-medium flex items-center">
                    {isGeneratingReport ? (
                      <>
                        <svg className="w-4 h-4 text-purple-500 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Real-time Analysis (Streaming...)
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Analysis Results
                      </>
                    )}
                  </h5>
                  <div ref={chatMessagesRef} className="space-y-2">
                    {chatMessages.map(renderChatMessage)}
                  </div>
                </div>
              )}

              {/* Completion Status - Only show when no messages to avoid redundancy */}
              {isGeneratingReport && chatMessages.length === 0 && (
                <div className="bg-purple-100 border border-purple-300 rounded-md p-3">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-purple-500 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p className="text-purple-700">Initializing analysis...</p>
                  </div>
                </div>
              )}

              {isChatComplete && !isGeneratingReport && chatMessages.length > 0 && (
                <div className="bg-green-100 border border-green-300 rounded-md p-3 mt-3">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-green-700">Analysis completed successfully!</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            {(error || result) && (
              <button
                onClick={resetUpload}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Reset
              </button>
            )}
            
            {hasFiles && !result && (
              <button
                onClick={handleUploadClick}
                disabled={isUploading}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  isUploading
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isUploading ? 'Uploading...' : 'Upload Video'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoUpload;