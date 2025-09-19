// API Configuration
export const API_CONFIG = {
  // Use environment variable or fallback to production server
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://64.227.97.134:8000',
  
  // API endpoints
  endpoints: {
    health: '/health',
    root: '/',
    generateVideo: '/api/videos/generate',
    uploadVideo: '/api/videos/upload',
    gradeVideo: (videoId: string) => `/api/videos/${videoId}/grade`,
    videoStatus: (videoId: string) => `/api/videos/${videoId}/status`,
    videoLogs: (videoId: string) => `/api/videos/${videoId}/logs`,
    listVideos: '/api/videos',
    playVideo: (videoId: string) => `/api/videos/${videoId}/play`,
  },
  
  // Request configuration
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
  
  // Timeout configuration (in milliseconds)
  timeout: 30000, // 30 seconds
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.baseUrl}${endpoint}`;
};

// Helper function for API requests with error handling
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = buildApiUrl(endpoint);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...API_CONFIG.defaultHeaders,
        ...options.headers,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
    }
    
    throw error;
  }
};
