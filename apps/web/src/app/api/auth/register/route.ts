import { NextRequest } from 'next/server'

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://127.0.0.1:8080'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const response = await fetch(`${INTERNAL_API_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': req.headers.get('content-type') || 'application/json',
    },
    body,
  })

  const text = await response.text()

  return new Response(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    },
  })
}


