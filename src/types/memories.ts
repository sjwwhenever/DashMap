// API Response Types
export interface MemoriesApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Video Upload Types
export interface VideoUploadRequest {
  file: File;
  title?: string;
  description?: string;
  tags?: string[];
}

export interface VideoUploadResponse {
  id: string;
  url: string;
  uploadUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

// Upload Progress Types
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  timeRemaining?: number;
}

// Video Metadata Types
export interface VideoMetadata {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  fileSize: number;
  format: string;
  resolution?: {
    width: number;
    height: number;
  };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// Video Analysis Types
export interface VideoAnalysis {
  id: string;
  videoId: string;
  transcript?: string;
  summary?: string;
  keyframes?: string[];
  objects?: DetectedObject[];
  emotions?: EmotionAnalysis[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  timestamp: number;
}

export interface EmotionAnalysis {
  emotion: string;
  confidence: number;
  timestamp: number;
}

// API Configuration Types
export interface MemoriesApiConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

// Error Types
export interface MemoriesApiError {
  code: string;
  message: string;
  details?: any;
}

// Upload Hook State Types
export interface UploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  result: VideoUploadResponse | null;
}

// Component Props Types
export interface VideoUploadProps {
  onUploadComplete?: (result: VideoUploadResponse) => void;
  onUploadError?: (error: string) => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  acceptedFormats?: string[];
  maxFileSize?: number;
  multiple?: boolean;
}

// Drag and Drop Types
export interface DragDropState {
  isDragging: boolean;
  dragCounter: number;
}

// Video Preview Types
export interface VideoPreview {
  file: File;
  url: string;
  name: string;
  size: number;
  type: string;
  duration?: number;
}