import { NextRequest, NextResponse } from 'next/server';

const CITY_SERVICE_URL = process.env.CITY_SERVICE_URL || 'http://daarion-city-service:7001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    
    const response = await fetch(
      `${CITY_SERVICE_URL}/city/citizens?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Citizens list proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to get citizens' },
      { status: 500 }
    );
  }
}

