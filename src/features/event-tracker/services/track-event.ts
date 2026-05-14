export interface TrackEventPayload {
  strategy_id?:  string
  event_type:    'click' | 'dm' | 'save' | 'view' | 'share'
  platform?:     'facebook' | 'instagram' | 'tiktok' | 'whatsapp' | 'youtube'
  utm_source?:   string
  utm_medium?:   string
  utm_campaign?: string
  utm_content?:  string
  utm_term?:     string
  lead_id?:      string
  metadata?:     Record<string, unknown>
}

// Extrae parámetros UTM desde una URL completa (ej. URL del anuncio o del post)
export function extractUtmFromUrl(url: string): Partial<TrackEventPayload> {
  try {
    const u = new URL(url)
    return {
      utm_source:   u.searchParams.get('utm_source')   ?? undefined,
      utm_medium:   u.searchParams.get('utm_medium')   ?? undefined,
      utm_campaign: u.searchParams.get('utm_campaign') ?? undefined,
      utm_content:  u.searchParams.get('utm_content')  ?? undefined,
      utm_term:     u.searchParams.get('utm_term')     ?? undefined,
    }
  } catch {
    return {}
  }
}

// Para WhatsApp: el source_key de la campaña actúa como utm_content
// Ej: leads.source = 'fb_madres_may' → utm_content = 'madres_may'
export function utmFromWhatsAppSource(source: string): Partial<TrackEventPayload> {
  if (!source.startsWith('fb_')) return {}
  return {
    utm_source:  'facebook',
    utm_medium:  'cpc',
    utm_content: source.replace('fb_', ''),
  }
}

// Cliente: fire-and-forget desde el browser (nunca bloquea el flujo del usuario)
export function trackEvent(payload: TrackEventPayload): void {
  fetch('/api/events/track', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  }).catch(() => undefined)
}

// Servidor: inserta directamente en Supabase (Server Actions, webhooks, API routes)
// Importar solo en código server-side
export async function trackEventServer(payload: TrackEventPayload): Promise<void> {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    await supabase.from('events').insert(payload as never)
  } catch {
    // Fire-and-forget — nunca bloquear el flujo principal
  }
}
