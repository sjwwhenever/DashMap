import {
  MemoriesApiConfig,
  MemoriesApiResponse,
  VideoUploadRequest,
  VideoUploadResponse,
  VideoMetadata,
  VideoAnalysis,
  UploadProgress,
} from '@/types/memories';

class MemoriesApiClient {
  private config: MemoriesApiConfig;

  constructor(config: MemoriesApiConfig) {
    this.config = config;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<MemoriesApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: this.config.timeout 
          ? AbortSignal.timeout(this.config.timeout)
          : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async uploadVideo(
    uploadRequest: VideoUploadRequest,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<MemoriesApiResponse<VideoUploadResponse>> {
    const formData = new FormData();
    formData.append('file', uploadRequest.file);
    
    if (uploadRequest.title) {
      formData.append('title', uploadRequest.title);
    }
    
    if (uploadRequest.description) {
      formData.append('description', uploadRequest.description);
    }
    
    if (uploadRequest.tags) {
      formData.append('tags', JSON.stringify(uploadRequest.tags));
    }

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              success: true,
              data,
            });
          } else {
            resolve({
              success: false,
              error: data.message || `HTTP error! status: ${xhr.status}`,
            });
          }
        } catch (error) {
          resolve({
            success: false,
            error: 'Failed to parse response',
          });
        }
      });

      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: 'Network error occurred',
        });
      });

      xhr.addEventListener('timeout', () => {
        resolve({
          success: false,
          error: 'Request timeout',
        });
      });

      // Configure request
      xhr.open('POST', `${this.config.baseUrl}/api/v1/videos/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${this.config.apiKey}`);
      
      if (this.config.timeout) {
        xhr.timeout = this.config.timeout;
      }

      // Send the request
      xhr.send(formData);
    });
  }

  async getVideoMetadata(videoId: string): Promise<MemoriesApiResponse<VideoMetadata>> {
    return this.makeRequest<VideoMetadata>(`/api/v1/videos/${videoId}`);
  }

  async getVideoAnalysis(videoId: string): Promise<MemoriesApiResponse<VideoAnalysis>> {
    return this.makeRequest<VideoAnalysis>(`/api/v1/videos/${videoId}/analysis`);
  }

  async deleteVideo(videoId: string): Promise<MemoriesApiResponse<void>> {
    return this.makeRequest<void>(`/api/v1/videos/${videoId}`, {
      method: 'DELETE',
    });
  }

  async listVideos(page = 1, limit = 10): Promise<MemoriesApiResponse<VideoMetadata[]>> {
    return this.makeRequest<VideoMetadata[]>(`/api/v1/videos?page=${page}&limit=${limit}`);
  }
}

// Factory function to create API client
export function createMemoriesApiClient(): MemoriesApiClient {
  const config: MemoriesApiConfig = {
    baseUrl: process.env.NEXT_PUBLIC_MEMORIES_API_URL || 'https://api.memories.ai',
    apiKey: process.env.MEMORIES_API_KEY || '',
    timeout: 30000, // 30 seconds
  };

  return new MemoriesApiClient(config);
}

// Alternative MAVI API client (if different endpoints are needed)
export function createMaviApiClient(): MemoriesApiClient {
  const config: MemoriesApiConfig = {
    baseUrl: process.env.NEXT_PUBLIC_MAVI_API_URL || 'https://api.openinterx.com',
    apiKey: process.env.MAVI_API_KEY || '',
    timeout: 30000,
  };

  return new MemoriesApiClient(config);
}

// Utility functions
export function validateVideoFile(file: File): { isValid: boolean; error?: string } {
  const allowedTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/ogg',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Unsupported video format. Please upload MP4, MOV, AVI, WebM, or OGG files.',
    };
  }

  // Check file size (default max: 500MB)
  const maxSize = 500 * 1024 * 1024; // 500MB in bytes
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size too large. Maximum allowed size is 500MB.',
    };
  }

  return { isValid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatUploadSpeed(bytesPerSecond: number): string {
  return formatFileSize(bytesPerSecond) + '/s';
}

export function estimateTimeRemaining(loaded: number, total: number, speed: number): number {
  const remaining = total - loaded;
  return Math.round(remaining / speed);
}

export default MemoriesApiClient;