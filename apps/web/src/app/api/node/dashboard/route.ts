import { NextRequest, NextResponse } from 'next/server';

const NODE_REGISTRY_URL = process.env.NODE_REGISTRY_URL || 'http://dagi-node-registry:9205';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    
    // Build URL - either specific node or self
    const endpoint = nodeId 
      ? `${NODE_REGISTRY_URL}/api/v1/nodes/${nodeId}/dashboard`
      : `${NODE_REGISTRY_URL}/api/v1/nodes/self/dashboard`;
    
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Revalidate every 10 seconds
      next: { revalidate: 10 }
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch dashboard: ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Node dashboard proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch node dashboard' },
      { status: 500 }
    );
  }
}

