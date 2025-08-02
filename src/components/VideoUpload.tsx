'use client';

import React, { useRef, useState } from 'react';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { VideoUploadProps, VideoPreview } from '@/types/memories';
import { formatFileSize } from '@/lib/memories-api';

const VideoUpload: React.FC<VideoUploadProps> = ({
  onUploadComplete,
  onUploadError,
  onUploadProgress,
  onTranscriptionComplete,
  onTranscriptionError,
  onProcessingStatusChange,
  acceptedFormats = ['video/*'],
  maxFileSize = 500 * 1024 * 1024, // 500MB
  multiple = true,
  autoTranscribe = true,
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

  const {
    uploadState,
    transcriptionState,
    previews,
    dragState,
    uploadVideo,
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
  } = useVideoUpload({
    onUploadComplete,
    onUploadError,
    onUploadProgress,
    onTranscriptionComplete,
    onTranscriptionError,
    onProcessingStatusChange,
    maxFileSize,
    autoTranscribe,
  });

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
      
      <video
        src={preview.url}
        className="w-full h-32 object-cover rounded-md bg-gray-200"
        controls={false}
        muted
        preload="metadata"
      />
    </div>
  );

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
        multiple={multiple}
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Upload Videos to Memories.ai
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
              
              {!isUploading && (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={handleSelectFiles}
                >
                  <p className="text-gray-500">Click to add more videos</p>
                </div>
              )}
            </div>
          )}

          {/* Upload Metadata Form */}
          {hasFiles && !result && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Video Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    value={uploadMetadata.title}
                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter video title"
                    disabled={isUploading}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={uploadMetadata.description}
                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter video description"
                    disabled={isUploading}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (optional)
                  </label>
                  <input
                    type="text"
                    value={uploadMetadata.tags}
                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter tags separated by commas"
                    disabled={isUploading}
                  />
                </div>
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
                    This may take a few minutes depending on video length.
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