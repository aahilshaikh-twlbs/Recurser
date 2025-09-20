import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://64.227.97.134:8000'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Forward the FormData directly to the backend
    const response = await fetch(`${BACKEND_URL}/api/videos/upload`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type - let fetch set it with boundary
      // Add timeout for upload
      signal: AbortSignal.timeout(120000), // 120 seconds for upload
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
      return NextResponse.json(error, { status: response.status })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Video upload failed:', error)
    return NextResponse.json(
      { 
        detail: 'Failed to upload video',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 502 }
    )
  }
}
