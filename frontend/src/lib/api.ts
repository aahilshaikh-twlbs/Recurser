// API utility functions with proper error handling

// Always use relative paths - they'll be proxied appropriately
const API_BASE = ''

interface ApiOptions extends RequestInit {
  timeout?: number
}

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchWithTimeout(url: string, options: ApiOptions = {}): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new ApiError(408, 'Request timeout')
    }
    throw error
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`
  
  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        detail: `API request failed: ${response.status}` 
      }))
      throw new ApiError(response.status, errorData.detail || response.statusText, errorData)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    // Network errors or other issues
    console.error('API request failed:', error)
    throw new ApiError(502, 'Network error or server unavailable')
  }
}

export async function uploadFile(
  endpoint: string,
  formData: FormData,
  options: Omit<ApiOptions, 'body'> = {}
): Promise<any> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`
  
  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      method: 'POST',
      body: formData
      // Don't set Content-Type for FormData - browser will set it with boundary
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        detail: `Upload failed: ${response.status}` 
      }))
      throw new ApiError(response.status, errorData.detail || response.statusText, errorData)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    console.error('Upload failed:', error)
    throw new ApiError(502, 'Upload failed or server unavailable')
  }
}

// Health check function
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout('/api/health', { 
      timeout: 5000 
    })
    return response.ok
  } catch {
    return false
  }
}

// Video-specific API functions
export async function getVideosFromIndex(indexId: string): Promise<any[]> {
  try {
    const response = await apiRequest(`/api/index/${indexId}/videos`)
    const data = await response.json()
    
    // Extract videos from the nested response structure
    if (data.success && data.data && data.data.videos) {
      return data.data.videos
    }
    
    console.warn('Unexpected API response structure:', data)
    return []
  } catch (error) {
    console.error('Failed to fetch videos:', error)
    return [] // Return empty array on error
  }
}

export async function generateVideo(data: any): Promise<any> {
  return await apiRequest('/api/videos/generate', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function uploadVideo(formData: FormData): Promise<any> {
  return await uploadFile('/api/videos/upload', formData)
}

export { ApiError }
