import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://64.227.97.134:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${BACKEND_URL}/api/videos/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // Add timeout for long generation
      signal: AbortSignal.timeout(60000), // 60 seconds
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Generation failed' }))
      return NextResponse.json(error, { status: response.status })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Video generation failed:', error)
    return NextResponse.json(
      { 
        detail: 'Failed to generate video',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 502 }
    )
  }
}
