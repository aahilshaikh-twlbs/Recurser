// API Configuration
export const API_CONFIG = {
  // Use proxy path for Vercel deployment (avoids CORS and mixed content issues)
  baseUrl: '', // Empty to use relative URLs through Next.js proxy
  
  // Default credentials for playground mode
  defaultCredentials: {
    twelvelabsApiKey: 'tlk_3JEVNXJ253JH062DSN3ZX1A6SXKG',
    playgroundIndexId: '68cd2969ca672ec899e0d9b7', // Recurser Prod index with actual videos
    geminiApiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '', // Can be set via env
  },
  
  // API endpoints
  endpoints: {
    health: '/api/health',
    root: '/api',
    generateVideo: '/api/videos/generate',
    uploadVideo: '/api/videos/upload',
    gradeVideo: (videoId: string) => `/api/videos/${videoId}/grade`,
    videoStatus: (videoId: string) => `/api/videos/${videoId}/status`,
    videoLogs: (videoId: string) => `/api/videos/${videoId}/logs`,
    listVideos: '/api/videos',
    listIndexVideos: (indexId: string) => `/api/index/${indexId}/videos`,
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
