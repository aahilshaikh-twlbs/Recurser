import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://64.227.97.134:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { indexId: string } }
) {
  const { indexId } = params
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/index/${indexId}/videos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(30000),
    })
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch videos from index:', error)
    
    // Return proper structure instead of empty array to prevent app crash
    return NextResponse.json({
      success: false,
      data: {
        index_id: indexId,
        video_count: 0,
        videos: []
      },
      error: 'Backend unavailable'
    }, { status: 200 })
  }
}
