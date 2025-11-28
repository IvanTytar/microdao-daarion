import { NextRequest, NextResponse } from 'next/server';

const CITY_SERVICE_URL = process.env.CITY_SERVICE_URL || 'http://daarion-city-service:7001';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    
    const response = await fetch(
      `${CITY_SERVICE_URL}/city/citizens/${encodeURIComponent(slug)}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Citizen not found' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Citizen get proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to get citizen' },
      { status: 500 }
    );
  }
}

