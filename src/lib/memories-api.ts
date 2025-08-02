import {
  MemoriesApiConfig,
  MemoriesApiResponse,
  VideoUploadRequest,
  VideoUploadResponse,
  VideoTranscriptionResponse,
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
          'Authorization': this.config.apiKey,
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
          const response = JSON.parse(xhr.responseText);
          
          // Debug logging
          console.log('Upload response status:', xhr.status);
          console.log('Upload response body:', response);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            // Check API response code for success
            if (response.code === '0000') {
              console.log('Upload successful, videoNo:', response.data?.videoNo);
              resolve({
                success: true,
                data: response,
              });
            } else {
              console.error('Upload failed with API code:', response.code, 'Message:', response.msg);
              resolve({
                success: false,
                error: response.msg || 'Upload failed',
              });
            }
          } else {
            console.error('Upload failed with HTTP status:', xhr.status);
            resolve({
              success: false,
              error: response.msg || `HTTP error! status: ${xhr.status}`,
            });
          }
        } catch (error) {
          console.error('Failed to parse upload response:', error);
          console.error('Raw response text:', xhr.responseText);
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
      const url = uploadRequest.callback 
        ? `${this.config.baseUrl}/serve/api/video/upload?callback=${encodeURIComponent(uploadRequest.callback)}`
        : `${this.config.baseUrl}/serve/api/video/upload`;
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', this.config.apiKey);
      
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

  async getVideoTranscription(videoNo: string): Promise<MemoriesApiResponse<VideoTranscriptionResponse>> {
    const response = await this.makeRequest<VideoTranscriptionResponse>(
      `/serve/api/video/get_video_transcription?video_no=${encodeURIComponent(videoNo)}`
    );
    
    // Handle the specific response format from the transcription API
    if (response.success && response.data) {
      // Check if the API returned success
      if (response.data.code === '0000') {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: response.data.msg || 'Failed to get transcription',
        };
      }
    }
    
    return response;
  }

  async pollVideoStatus(videoNo: string, maxAttempts = 30, intervalMs = 5000): Promise<MemoriesApiResponse<'PARSE' | 'UNPARSE' | 'FAIL'>> {
    console.log(`Starting video status polling for ${videoNo}, max attempts: ${maxAttempts}, interval: ${intervalMs}ms`);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      console.log(`Polling attempt ${attempt + 1}/${maxAttempts} for video ${videoNo}`);
      
      try {
        // Try to get transcription - if it succeeds, video is processed
        const transcriptionResponse = await this.getVideoTranscription(videoNo);
        
        console.log(`Transcription response for attempt ${attempt + 1}:`, {
          success: transcriptionResponse.success,
          error: transcriptionResponse.error,
          hasData: !!transcriptionResponse.data
        });
        
        if (transcriptionResponse.success) {
          console.log(`Video ${videoNo} is ready! Transcription available.`);
          return {
            success: true,
            data: 'PARSE',
          };
        }
        
        // If transcription fails, video might still be processing
        console.log(`Transcription not ready yet. Error: ${transcriptionResponse.error}`);
        
        if (transcriptionResponse.error?.includes('not found') || 
            transcriptionResponse.error?.includes('processing') ||
            transcriptionResponse.error?.includes('not ready') ||
            transcriptionResponse.error?.includes('still processing')) {
          // Wait before next attempt
          if (attempt < maxAttempts - 1) {
            console.log(`Video still processing, waiting ${intervalMs}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, intervalMs));
            continue;
          }
        }
        
        // If error is not about processing, return the error
        console.error(`Video processing failed with error: ${transcriptionResponse.error}`);
        return {
          success: false,
          error: transcriptionResponse.error || 'Unknown error',
        };
        
      } catch (error) {
        console.error(`Polling attempt ${attempt + 1} failed:`, error);
        
        if (attempt === maxAttempts - 1) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Polling failed',
          };
        }
        
        // Wait before retry
        console.log(`Retrying in ${intervalMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    
    console.error(`Video processing timeout after ${maxAttempts} attempts`);
    return {
      success: false,
      error: 'Video processing timeout - max attempts reached',
    };
  }
}

// Factory function to create API client
export function createMemoriesApiClient(): MemoriesApiClient {
  const config: MemoriesApiConfig = {
    baseUrl: process.env.NEXT_PUBLIC_MEMORIES_API_URL || 'https://api.memories.ai',
    apiKey: process.env.NEXT_PUBLIC_MEMORIES_API_KEY || '',
    timeout: 30000, // 30 seconds
  };


  return new MemoriesApiClient(config);
}

// Alternative MAVI API client (uses same memories.ai domain)
export function createMaviApiClient(): MemoriesApiClient {
  const config: MemoriesApiConfig = {
    baseUrl: process.env.NEXT_PUBLIC_MAVI_API_URL || 'https://api.memories.ai',
    apiKey: process.env.NEXT_PUBLIC_MAVI_API_KEY || '',
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