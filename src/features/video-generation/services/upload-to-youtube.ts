/**
 * Sube un video a YouTube como 'unlisted' usando YouTube Data API v3.
 *
 * Requisitos en env:
 *   YOUTUBE_CLIENT_ID        — OAuth2 client ID de Google Cloud Console
 *   YOUTUBE_CLIENT_SECRET    — OAuth2 client secret
 *   YOUTUBE_REFRESH_TOKEN    — Refresh token del canal destino (generado offline una vez)
 *
 * El access token se renueva automáticamente en cada llamada.
 */
export async function uploadToYouTube(params: {
  videoBuffer: ArrayBuffer
  title: string
  description?: string
}): Promise<{ youtubeUrl: string; videoId: string }> {
  const { videoBuffer, title, description = '' } = params

  const clientId = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing YouTube credentials (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN)')
  }

  // 1. Obtener access token usando refresh token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!tokenRes.ok) throw new Error(`YouTube token refresh failed: ${await tokenRes.text()}`)

  const tokenData = (await tokenRes.json()) as { access_token?: string }
  const accessToken = tokenData.access_token
  if (!accessToken) throw new Error('No access_token in YouTube token response')

  // 2. Iniciar upload resumable (multipart)
  const metadata = {
    snippet: {
      title,
      description,
      tags: ['cancion personalizada', 'canciobot'],
    },
    status: {
      privacyStatus: 'unlisted', // visible con enlace, no indexado
    },
  }

  const boundary = '-------314159265358979323846'
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const metadataPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`
  const videoPart = `Content-Type: video/mp4\r\n\r\n`

  const encoder = new TextEncoder()
  const metadataBytes = encoder.encode(`${delimiter}${metadataPart}${delimiter}${videoPart}`)
  const closeBytes = encoder.encode(closeDelimiter)

  const body = new Uint8Array(metadataBytes.byteLength + videoBuffer.byteLength + closeBytes.byteLength)
  body.set(metadataBytes, 0)
  body.set(new Uint8Array(videoBuffer), metadataBytes.byteLength)
  body.set(closeBytes, metadataBytes.byteLength + videoBuffer.byteLength)

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
        'Content-Length': String(body.byteLength),
      },
      body,
    }
  )

  if (!uploadRes.ok) throw new Error(`YouTube upload failed: ${await uploadRes.text()}`)

  const uploadData = (await uploadRes.json()) as { id?: string }
  const videoId = uploadData.id
  if (!videoId) throw new Error('No video ID in YouTube upload response')

  return {
    youtubeUrl: `https://youtu.be/${videoId}`,
    videoId,
  }
}
