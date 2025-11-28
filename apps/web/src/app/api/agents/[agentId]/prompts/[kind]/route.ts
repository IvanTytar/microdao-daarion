import { NextRequest, NextResponse } from 'next/server';

const CITY_SERVICE_URL = process.env.CITY_SERVICE_URL || 'http://daarion-city-service:7001';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ agentId: string; kind: string }> }
) {
  try {
    const { agentId, kind } = await context.params;
    const body = await request.json();
    
    // Validate kind
    const validKinds = ['core', 'safety', 'governance', 'tools'];
    if (!validKinds.includes(kind)) {
      return NextResponse.json(
        { error: `Invalid kind. Must be one of: ${validKinds.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Forward to backend
    const response = await fetch(
      `${CITY_SERVICE_URL}/city/agents/${encodeURIComponent(agentId)}/prompts/${encodeURIComponent(kind)}`,
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
    console.error('Agent prompt update proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to update agent prompt' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ agentId: string; kind: string }> }
) {
  try {
    const { agentId, kind } = await context.params;
    
    // Get history
    const response = await fetch(
      `${CITY_SERVICE_URL}/city/agents/${encodeURIComponent(agentId)}/prompts/${encodeURIComponent(kind)}/history`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Agent prompt history proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to get prompt history' },
      { status: 500 }
    );
  }
}

