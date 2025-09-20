import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://64.227.97.134:8000';

async function handler(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join('/');
    const url = `${BACKEND_URL}/api/${path}`;
    
    // Forward headers
    const headers: HeadersInit = {};
    request.headers.forEach((value, key) => {
      // Skip host header to avoid issues
      if (key.toLowerCase() !== 'host') {
        headers[key] = value;
      }
    });
    
    // Forward the request
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.body ? await request.text() : undefined,
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return handler(request, context);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return handler(request, context);
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return handler(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return handler(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return handler(request, context);
}
