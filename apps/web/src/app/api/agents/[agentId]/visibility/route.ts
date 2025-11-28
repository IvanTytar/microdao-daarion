import { NextRequest, NextResponse } from 'next/server';

const CITY_API_URL = process.env.INTERNAL_API_URL || process.env.CITY_API_BASE_URL || 'http://daarion-city-service:7001';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await context.params;
    const body = await request.json();

    const response = await fetch(`${CITY_API_URL}/city/agents/${agentId}/visibility`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Failed to update agent visibility:', response.status, text);
      return NextResponse.json(
        { error: 'Failed to update visibility' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating agent visibility:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
