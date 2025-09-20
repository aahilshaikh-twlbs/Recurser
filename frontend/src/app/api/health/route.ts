import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://64.227.97.134:8000'

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(5000),
    })
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'Backend unavailable',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}
