/**
 * Sube un video a YouTube como 'unlisted' usando YouTube Data API v3
 * con upload resumable (necesario para videos > 5 MB).
 *
 * Requisitos en env:
 *   YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
 *
 * Flujo resumable:
 *   1. Refresh access token con refresh_token
 *   2. POST /upload/.../videos?uploadType=resumable con metadata → 200 + Location
 *   3. PUT al Location con el binario completo (en una sola request si cabe)
 *   4. Respuesta 200/201 incluye el video.id
 */
export async function uploadToYouTube(params: {
  videoBuffer: Buffer | ArrayBuffer
  title: string
  description?: string
}): Promise<{ youtubeUrl: string; videoId: string }> {
  const { videoBuffer, title, description = '' } = params

  const clientId = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing YouTube credentials')
  }

  // 1. Access token via refresh
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
  const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string }
  if (!accessToken) throw new Error('No access_token in YouTube token response')

  // Blob necesita un ArrayBuffer "real" (no SharedArrayBuffer ni una vista sobre Buffer pool)
  const ab = new ArrayBuffer(videoBuffer.byteLength)
  const view = new Uint8Array(ab)
  if (videoBuffer instanceof Buffer) {
    view.set(new Uint8Array(videoBuffer.buffer, videoBuffer.byteOffset, videoBuffer.byteLength))
  } else {
    view.set(new Uint8Array(videoBuffer))
  }
  const blob = new Blob([ab], { type: 'video/mp4' })
  const totalBytes = blob.size

  // 2. Iniciar sesión resumable con metadata
  const metadata = {
    snippet: { title, description, tags: ['cancion personalizada', 'canciobot'] },
    status: { privacyStatus: 'unlisted' as const },
  }
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(totalBytes),
      },
      body: JSON.stringify(metadata),
    }
  )
  if (!initRes.ok) throw new Error(`YouTube resumable init failed: ${await initRes.text()}`)

  const uploadUrl = initRes.headers.get('location')
  if (!uploadUrl) throw new Error('YouTube no devolvió Location en respuesta resumable')

  // 3. Subir el binario completo (PUT). Para videos < 256 MB un solo request es suficiente.
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(totalBytes),
    },
    body: blob,
  })

  if (!uploadRes.ok) throw new Error(`YouTube resumable upload failed: ${await uploadRes.text()}`)

  const { id: videoId } = (await uploadRes.json()) as { id?: string }
  if (!videoId) throw new Error('No video ID in YouTube upload response')

  return { youtubeUrl: `https://youtu.be/${videoId}`, videoId }
}
