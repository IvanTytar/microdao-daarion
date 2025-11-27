import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = process.env.MATRIX_GATEWAY_URL || 'http://localhost:7025'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate required fields
    if (!body.matrix_user_id || !body.access_token) {
      return NextResponse.json(
        { error: 'Missing required fields: matrix_user_id, access_token' },
        { status: 400 }
      )
    }

    // Proxy to matrix-gateway
    const response = await fetch(`${GATEWAY_URL}/internal/matrix/presence/online`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matrix_user_id: body.matrix_user_id,
        access_token: body.access_token,
        status: body.status || 'online',
        status_msg: body.status_msg,
      }),
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Presence Proxy] Error:', error)
    return NextResponse.json(
      { error: 'Failed to set presence' },
      { status: 500 }
    )
  }
}

