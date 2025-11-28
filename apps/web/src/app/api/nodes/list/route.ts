import { NextRequest, NextResponse } from 'next/server';

const CITY_API_URL = process.env.INTERNAL_API_URL || process.env.CITY_API_BASE_URL || 'http://daarion-city-service:7001';

export async function GET(_req: NextRequest) {
  try {
    const response = await fetch(`${CITY_API_URL}/public/nodes`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Failed to fetch nodes:', response.status, text);
      return NextResponse.json(
        { error: 'Failed to fetch nodes' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

