import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://64.227.97.134:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { indexId: string } }
) {
  try {
    const { indexId } = params;
    const apiKey = request.headers.get('X-Twelvelabs-Api-Key');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      headers['X-Twelvelabs-Api-Key'] = apiKey;
    }
    
    const response = await fetch(`${BACKEND_URL}/api/index/${indexId}/videos`, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
