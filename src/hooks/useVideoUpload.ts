'use client';

import { useState, useCallback, useRef } from 'react';
import {
  UploadState,
  VideoUploadRequest,
  VideoUploadResponse,
  VideoTranscriptionResponse,
  UploadProgress,
  DragDropState,
  VideoPreview,
  VideoChatMessage,
  VideoChatState,
  VideoChatRequest,
} from '@/types/memories';
import { createMemoriesApiClient, validateVideoFile } from '@/lib/memories-api';

interface UseVideoUploadOptions {
  onUploadComplete?: (result: VideoUploadResponse) => void;
  onUploadError?: (error: string) => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  onTranscriptionComplete?: (transcription: VideoTranscriptionResponse) => void;
  onTranscriptionError?: (error: string) => void;
  onProcessingStatusChange?: (status: 'uploading' | 'processing' | 'transcribing' | 'completed' | 'error') => void;
  onChatMessage?: (message: VideoChatMessage) => void;
  onChatComplete?: (messages: VideoChatMessage[]) => void;
  onChatError?: (error: string) => void;
  maxFileSize?: number;
  acceptedFormats?: string[];
  autoTranscribe?: boolean;
  autoGenerateReport?: boolean;
  defaultReportPrompt?: string;
}

export function useVideoUpload(options: UseVideoUploadOptions = {}) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: null,
    error: null,
    result: null,
  });

  const [transcriptionState, setTranscriptionState] = useState<{
    isProcessing: boolean;
    transcription: VideoTranscriptionResponse | null;
    error: string | null;
    status: 'idle' | 'processing' | 'transcribing' | 'completed' | 'error';
  }>({
    isProcessing: false,
    transcription: null,
    error: null,
    status: 'idle',
  });

  const [chatState, setChatState] = useState<VideoChatState>({
    isGenerating: false,
    messages: [],
    sessionId: null,
    error: null,
    isComplete: false,
  });

  const [previews, setPreviews] = useState<VideoPreview[]>([]);
  const [dragState, setDragState] = useState<DragDropState>({
    isDragging: false,
    dragCounter: 0,
  });

  const apiClient = useRef(createMemoriesApiClient());

  const resetUpload = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: null,
      error: null,
      result: null,
    });
    setTranscriptionState({
      isProcessing: false,
      transcription: null,
      error: null,
      status: 'idle',
    });
    setChatState({
      isGenerating: false,
      messages: [],
      sessionId: null,
      error: null,
      isComplete: false,
    });
  }, []);

  const createVideoPreview = useCallback((file: File): VideoPreview => {
    const url = URL.createObjectURL(file);
    return {
      file,
      url,
      name: file.name,
      size: file.size,
      type: file.type,
    };
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newPreviews: VideoPreview[] = [];

    fileArray.forEach((file) => {
      const validation = validateVideoFile(file);
      if (validation.isValid) {
        newPreviews.push(createVideoPreview(file));
      } else {
        setUploadState(prev => ({
          ...prev,
          error: validation.error || 'Invalid file',
        }));
      }
    });

    setPreviews(prev => [...prev, ...newPreviews]);
  }, [createVideoPreview]);

  const removePreview = useCallback((index: number) => {
    setPreviews(prev => {
      const newPreviews = [...prev];
      const removedPreview = newPreviews.splice(index, 1)[0];
      if (removedPreview) {
        URL.revokeObjectURL(removedPreview.url);
      }
      return newPreviews;
    });
  }, []);

  const clearPreviews = useCallback(() => {
    previews.forEach(preview => URL.revokeObjectURL(preview.url));
    setPreviews([]);
  }, [previews]);

  const generateReport = useCallback(async (videoNos: string[], prompt: string, sessionId?: string) => {
    setChatState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      isComplete: false,
      messages: [],
    }));

    try {
      const chatRequest: VideoChatRequest = {
        video_nos: videoNos,
        prompt,
        session_id: sessionId,
      };

      const response = await apiClient.current.chatWithVideo(
        chatRequest,
        (message) => {
          setChatState(prev => ({
            ...prev,
            messages: [...prev.messages, message],
            sessionId: message.sessionId,
          }));
          options.onChatMessage?.(message);
        }
      );

      if (response.success && response.data) {
        setChatState(prev => ({
          ...prev,
          isGenerating: false,
          isComplete: true,
        }));
        options.onChatComplete?.(response.data);
      } else {
        throw new Error(response.error || 'Failed to generate report');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Report generation failed';
      setChatState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage,
        isComplete: false,
      }));
      options.onChatError?.(errorMessage);
    }
  }, [options]);

  const startTranscription = useCallback(async (videoNo: string) => {
    setTranscriptionState(prev => ({
      ...prev,
      isProcessing: true,
      status: 'processing',
      error: null,
    }));
    
    options.onProcessingStatusChange?.('processing');

    try {
      // Poll for video processing completion
      const statusResponse = await apiClient.current.pollVideoStatus(videoNo);
      
      if (!statusResponse.success) {
        throw new Error(statusResponse.error || 'Failed to check video status');
      }

      if (statusResponse.data === 'PARSE') {
        // Video is processed, get transcription
        setTranscriptionState(prev => ({
          ...prev,
          status: 'transcribing',
        }));
        options.onProcessingStatusChange?.('transcribing');

        const transcriptionResponse = await apiClient.current.getVideoTranscription(videoNo);
        
        if (transcriptionResponse.success && transcriptionResponse.data) {
          setTranscriptionState(prev => ({
            ...prev,
            isProcessing: false,
            transcription: transcriptionResponse.data || null,
            status: 'completed',
          }));
          
          options.onTranscriptionComplete?.(transcriptionResponse.data);
          options.onProcessingStatusChange?.('completed');

          // Automatically generate report if enabled
          if (options.autoGenerateReport !== false && transcriptionResponse.data) {
            const prompt = options.defaultReportPrompt || 'Please provide a comprehensive summary and analysis of this video content.';
            await generateReport([videoNo], prompt);
          }
        } else {
          throw new Error(transcriptionResponse.error || 'Failed to get transcription');
        }
      } else {
        throw new Error('Video processing failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transcription failed';
      setTranscriptionState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
        status: 'error',
      }));
      
      options.onTranscriptionError?.(errorMessage);
      options.onProcessingStatusChange?.('error');
    }
  }, [options, generateReport]);

  const uploadVideo = useCallback(async (
    file: File,
    title?: string,
    description?: string,
    tags?: string[]
  ) => {
    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      const error = validation.error || 'Invalid file';
      setUploadState(prev => ({ ...prev, error }));
      options.onUploadError?.(error);
      return;
    }

    setUploadState({
      isUploading: true,
      progress: null,
      error: null,
      result: null,
    });

    const uploadRequest: VideoUploadRequest = {
      file,
      title,
      description,
      tags,
    };

    try {
      const response = await apiClient.current.uploadVideo(
        uploadRequest,
        (progress) => {
          setUploadState(prev => ({ ...prev, progress }));
          options.onUploadProgress?.(progress);
        }
      );

      if (response.success && response.data) {
        setUploadState(prev => ({
          ...prev,
          isUploading: false,
          result: response.data || null,
        }));
        
        options.onUploadComplete?.(response.data);
        
        // Debug logging for videoNo extraction
        console.log('Checking for videoNo in response.data:', response.data);
        console.log('response.data.data:', response.data?.data);
        console.log('response.data.data.videoNo:', response.data?.data?.videoNo);
        
        // Automatically start transcription if enabled and we have a videoNo
        if (options.autoTranscribe !== false && response.data?.data?.videoNo) {
          console.log('Starting transcription for videoNo:', response.data.data.videoNo);
          await startTranscription(response.data.data.videoNo);
        } else if (options.autoTranscribe !== false) {
          console.warn('Auto-transcription enabled but no videoNo found in response');
        }
      } else {
        const error = response.error || 'Upload failed';
        setUploadState(prev => ({
          ...prev,
          isUploading: false,
          error,
        }));
        options.onUploadError?.(error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
      }));
      options.onUploadError?.(errorMessage);
    }
  }, [options, startTranscription]);

  const uploadMultipleVideos = useCallback(async (
    files: File[],
    getMetadata?: (file: File) => { title?: string; description?: string; tags?: string[] }
  ) => {
    for (const file of files) {
      const metadata = getMetadata?.(file) || {};
      await uploadVideo(file, metadata.title, metadata.description, metadata.tags);
    }
  }, [uploadVideo]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState(prev => ({
      isDragging: true,
      dragCounter: prev.dragCounter + 1,
    }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState(prev => {
      const newCounter = prev.dragCounter - 1;
      return {
        isDragging: newCounter > 0,
        dragCounter: newCounter,
      };
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragState({
      isDragging: false,
      dragCounter: 0,
    });

    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      addFiles(files);
    }
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files.length > 0) {
      addFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [addFiles]);

  return {
    // State
    uploadState,
    transcriptionState,
    chatState,
    previews,
    dragState,
    
    // Actions
    uploadVideo,
    uploadMultipleVideos,
    startTranscription,
    generateReport,
    addFiles,
    removePreview,
    clearPreviews,
    resetUpload,
    
    // Drag and drop handlers
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    
    // Computed values
    isUploading: uploadState.isUploading,
    progress: uploadState.progress,
    error: uploadState.error,
    result: uploadState.result,
    isDragging: dragState.isDragging,
    hasFiles: previews.length > 0,
    
    // Transcription computed values
    isProcessing: transcriptionState.isProcessing,
    transcription: transcriptionState.transcription,
    transcriptionError: transcriptionState.error,
    processingStatus: transcriptionState.status,
    
    // Chat computed values
    isGeneratingReport: chatState.isGenerating,
    chatMessages: chatState.messages,
    chatSessionId: chatState.sessionId,
    chatError: chatState.error,
    isChatComplete: chatState.isComplete,
  };
}