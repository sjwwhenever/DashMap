'use client';

import { useState, useCallback, useRef } from 'react';
import {
  UploadState,
  VideoUploadRequest,
  VideoUploadResponse,
  UploadProgress,
  DragDropState,
  VideoPreview,
} from '@/types/memories';
import { createMemoriesApiClient, validateVideoFile } from '@/lib/memories-api';

interface UseVideoUploadOptions {
  onUploadComplete?: (result: VideoUploadResponse) => void;
  onUploadError?: (error: string) => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  maxFileSize?: number;
  acceptedFormats?: string[];
}

export function useVideoUpload(options: UseVideoUploadOptions = {}) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: null,
    error: null,
    result: null,
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
  }, [options]);

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
    previews,
    dragState,
    
    // Actions
    uploadVideo,
    uploadMultipleVideos,
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
  };
}