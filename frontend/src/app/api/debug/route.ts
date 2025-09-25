import { NextResponse } from 'next/server'

export async function GET() {
  const backendUrl = process.env.BACKEND_URL || 'http://64.227.97.134:8000'
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    backendUrl: backendUrl,
    backendUrlTrimmed: backendUrl.trim(),
    hasBackendUrl: !!process.env.BACKEND_URL,
    hasTrailingSpace: backendUrl !== backendUrl.trim(),
    timestamp: new Date().toISOString()
  })
}
