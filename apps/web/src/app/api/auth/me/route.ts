import { NextRequest } from 'next/server'

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://127.0.0.1:8080'

export async function GET(req: NextRequest) {
  const response = await fetch(`${INTERNAL_API_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: req.headers.get('authorization') || '',
    },
  })

  const text = await response.text()

  return new Response(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    },
  })
}


