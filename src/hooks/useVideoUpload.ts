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
} from '@/types/memories';
import { createMemoriesApiClient, validateVideoFile } from '@/lib/memories-api';

interface UseVideoUploadOptions {
  onUploadComplete?: (result: VideoUploadResponse) => void;
  onUploadError?: (error: string) => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  onTranscriptionComplete?: (transcription: VideoTranscriptionResponse) => void;
  onTranscriptionError?: (error: string) => void;
  onProcessingStatusChange?: (status: 'uploading' | 'processing' | 'transcribing' | 'completed' | 'error') => void;
  maxFileSize?: number;
  acceptedFormats?: string[];
  autoTranscribe?: boolean;
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
  }, [options]);

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
    previews,
    dragState,
    
    // Actions
    uploadVideo,
    uploadMultipleVideos,
    startTranscription,
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
  };
}