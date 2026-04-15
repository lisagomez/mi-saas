import { generateText } from 'ai'
import { openrouter, MODELS, estimateCost } from '@/lib/ai/openrouter'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAiUsage } from '@/features/whatsapp-bot/services/log-ai-usage'
import { buildLyricsPrompt, LYRICS_SYSTEM_PROMPT } from '../prompts/lyrics-prompt'

export interface GenerateLyricsParams {
  orderId: string
  leadId: string
  storyText: string
  musicalStyle: string
  musicPrompt?: string   // directivas musicales regionales enriquecidas
}

export interface GenerateLyricsResult {
  lyricsText: string
  songId: string
}

/** Máx. chars por mensaje WhatsApp */
const WA_MAX_CHARS = 4096

/**
 * Genera la letra de la canción con IA, la persiste en `songs`, y registra el costo en `ai_usage`.
 * Devuelve la letra y el songId para uso posterior.
 */
export async function generateLyrics(
  params: GenerateLyricsParams
): Promise<GenerateLyricsResult> {
  const { orderId, leadId, storyText, musicalStyle, musicPrompt } = params

  const { text, usage } = await generateText({
    model: openrouter(MODELS.balanced),
    system: LYRICS_SYSTEM_PROMPT,
    prompt: buildLyricsPrompt(storyText, musicalStyle, musicPrompt),
  })

  const lyricsText = text.trim()

  // Persistir letra antes de enviar (anti-patrón: nunca en memoria solamente)
  const supabase = createAdminClient()
  const { data: song, error } = await supabase
    .from('songs')
    .insert({
      order_id: orderId,
      lyrics_text: lyricsText,
      model_used: MODELS.balanced,
    } as never)
    .select('id')
    .single()

  if (error) throw new Error(`generateLyrics insert song: ${error.message}`)

  // Calcular costo estimado y registrar uso
  const costUsd = usage
    ? estimateCost(MODELS.balanced, usage.inputTokens ?? 0, usage.outputTokens ?? 0)
    : null

  await logAiUsage({
    leadId,
    orderId,
    model: MODELS.balanced,
    tokensInput: usage?.inputTokens ?? null,
    tokensOutput: usage?.outputTokens ?? null,
    costUsd,
  })

  return { lyricsText, songId: (song as { id: string }).id }
}

/**
 * Divide la letra en chunks de máx. WA_MAX_CHARS para envío por WhatsApp.
 */
export function splitLyricsForWhatsApp(lyricsText: string): string[] {
  if (lyricsText.length <= WA_MAX_CHARS) return [lyricsText]

  const chunks: string[] = []
  let remaining = lyricsText

  while (remaining.length > 0) {
    if (remaining.length <= WA_MAX_CHARS) {
      chunks.push(remaining)
      break
    }
    // Cortar en el último salto de línea antes del límite
    const slice = remaining.slice(0, WA_MAX_CHARS)
    const lastNewline = slice.lastIndexOf('\n')
    const cutAt = lastNewline > 0 ? lastNewline : WA_MAX_CHARS
    chunks.push(remaining.slice(0, cutAt).trim())
    remaining = remaining.slice(cutAt).trim()
  }

  return chunks
}
