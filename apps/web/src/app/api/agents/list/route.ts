import { NextRequest, NextResponse } from 'next/server';

const CITY_API_URL = process.env.INTERNAL_API_URL || process.env.CITY_API_BASE_URL || 'http://daarion-city-service:7001';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get('kind');
    const node_id = searchParams.get('node_id');
    const limit = searchParams.get('limit') || '100';
    const offset = searchParams.get('offset') || '0';

    const params = new URLSearchParams();
    if (kind) params.set('kind', kind);
    if (node_id) params.set('node_id', node_id);
    params.set('limit', limit);
    params.set('offset', offset);

    const response = await fetch(`${CITY_API_URL}/public/agents?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Failed to fetch agents:', response.status, text);
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

