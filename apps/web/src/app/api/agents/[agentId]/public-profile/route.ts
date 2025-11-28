import { NextRequest, NextResponse } from 'next/server';

const CITY_SERVICE_URL = process.env.CITY_SERVICE_URL || 'http://daarion-city-service:7001';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await context.params;
    const body = await request.json();
    
    const response = await fetch(
      `${CITY_SERVICE_URL}/city/agents/${encodeURIComponent(agentId)}/public-profile`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Agent public profile update proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to update agent public profile' },
      { status: 500 }
    );
  }
}

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
      }
    );
    
    const data = await response.json();
    
    // Return just the public_profile part
    return NextResponse.json(data.public_profile || {}, { status: response.status });
    
  } catch (error) {
    console.error('Agent public profile get proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to get agent public profile' },
      { status: 500 }
    );
  }
}

