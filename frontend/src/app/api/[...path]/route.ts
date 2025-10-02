import { NextRequest, NextResponse } from 'next/server'

// Backend URL - use localhost for development, production URL for deployment
const BACKEND_URL = (process.env.BACKEND_URL || 
  (process.env.NODE_ENV === 'production' ? 'http://64.227.97.134:8000' : 'http://localhost:8000')).trim()

// Helper function to get the correct backend path
function getBackendPath(path: string): string {
  return path === 'health' ? 'health' : `api/${path}`
}

// Proxy all API requests to the backend
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const url = new URL(request.url)
  const backendPath = getBackendPath(path)
  const backendUrl = `${BACKEND_URL}/${backendPath}${url.search}`
  
  try {
    console.log(`Environment: NODE_ENV=${process.env.NODE_ENV}`)
    console.log(`Backend URL: ${BACKEND_URL}`)
    console.log(`Proxying GET request: ${path} -> ${backendUrl}`)
    
    // Check if BACKEND_URL is properly set
    if (!process.env.BACKEND_URL) {
      console.error('BACKEND_URL environment variable is not set!')
      return NextResponse.json(
        { 
          error: 'BACKEND_URL environment variable not configured',
          details: 'Please set BACKEND_URL in Vercel dashboard',
          backendUrl: BACKEND_URL
        },
        { status: 500 }
      )
    }
    
    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache', // Prevent caching of API responses
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000),
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('Backend response not ok:', response.status, response.statusText, errorText)
      return NextResponse.json(
        { error: `Backend error: ${response.status} ${response.statusText}`, details: errorText },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    console.log('Proxy response successful for:', path)
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('API proxy error for', path, ':', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend', details: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const backendPath = getBackendPath(path)
  const backendUrl = `${BACKEND_URL}/${backendPath}`
  
  try {
    const contentType = request.headers.get('content-type')
    let body: any
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle file uploads
      body = await request.formData()
    } else {
      // Handle JSON
      body = await request.text()
    }
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType || 'application/json',
      },
      body: contentType?.includes('multipart/form-data') ? body : body,
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend', details: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const backendPath = getBackendPath(path)
  const backendUrl = `${BACKEND_URL}/${backendPath}`
  
  try {
    const body = await request.json()
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend', details: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const backendPath = getBackendPath(path)
  const backendUrl = `${BACKEND_URL}/${backendPath}`
  
  try {
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend', details: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    )
  }
}
