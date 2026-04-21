import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.MUSICAPI_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'MUSICAPI_KEY no configurado', key_present: false })
  }

  try {
    const res = await fetch('https://api.musicapi.ai/api/v1/sonic/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        custom_mode: true,
        mv: 'sonic-v4-5',
        title: 'Test Debug',
        tags: 'corrido',
        prompt: '[Verse]\nEsta es una prueba de diagnóstico.',
        style_weight: 0.8,
      }),
    })

    const responseText = await res.text()
    return NextResponse.json({
      key_present: true,
      key_prefix: apiKey.slice(0, 8) + '...',
      status: res.status,
      ok: res.ok,
      response: responseText,
    })
  } catch (err) {
    return NextResponse.json({
      key_present: true,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
