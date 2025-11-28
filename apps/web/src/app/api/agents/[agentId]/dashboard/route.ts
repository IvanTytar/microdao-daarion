import { NextRequest, NextResponse } from 'next/server';

const CITY_SERVICE_URL = process.env.CITY_SERVICE_URL || 'http://daarion-city-service:7001';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await context.params;
    
    const response = await fetch(
      `${CITY_SERVICE_URL}/city/agents/${encodeURIComponent(agentId)}/dashboard`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      }
    );
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch agent dashboard: ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Agent dashboard proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent dashboard' },
      { status: 500 }
    );
  }
}

