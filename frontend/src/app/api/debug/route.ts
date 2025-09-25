import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    backendUrl: process.env.BACKEND_URL,
    hasBackendUrl: !!process.env.BACKEND_URL,
    timestamp: new Date().toISOString()
  })
}
