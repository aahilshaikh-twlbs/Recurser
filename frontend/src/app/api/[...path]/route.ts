import { NextRequest, NextResponse } from 'next/server'

// Backend URL - must be HTTPS in production
const BACKEND_URL = process.env.BACKEND_URL || 'http://64.227.97.134:8000'

// Proxy all API requests to the backend
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const url = new URL(request.url)
  const backendUrl = `${BACKEND_URL}/api/${path}${url.search}`
  
  try {
    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 502 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const backendUrl = `${BACKEND_URL}/api/${path}`
  
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
      { error: 'Failed to connect to backend' },
      { status: 502 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const backendUrl = `${BACKEND_URL}/api/${path}`
  
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
      { error: 'Failed to connect to backend' },
      { status: 502 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const backendUrl = `${BACKEND_URL}/api/${path}`
  
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
      { error: 'Failed to connect to backend' },
      { status: 502 }
    )
  }
}
