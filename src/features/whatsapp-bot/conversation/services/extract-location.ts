import { generateObject, zodSchema } from 'ai'
import { z } from 'zod'
import { openrouter, MODELS } from '@/lib/ai/openrouter'
import { createAdminClient } from '@/lib/supabase/admin'

const LocationSchema = z.object({
  origin: z.string().nullable().describe('Ciudad o región de origen del protagonista de la historia (de donde es). null si no se menciona.'),
  residence: z.string().nullable().describe('Ciudad o región donde vive actualmente el protagonista. null si no se menciona.'),
})

/**
 * Extrae origen y residencia del texto de historia usando IA.
 * Fire-and-forget: llama sin await desde el webhook para no bloquear la respuesta.
 * Si falla, no interrumpe el flujo — origin/residence quedan null.
 */
export async function extractAndSaveLocation(params: {
  leadId: string
  storyText: string
}): Promise<void> {
  const { leadId, storyText } = params

  try {
    const { object } = await generateObject({
      model: openrouter(MODELS.basic),
      schema: zodSchema(LocationSchema),
      system: 'Eres un extractor de información geográfica. Analiza el texto y extrae únicamente el origen y residencia del protagonista de la historia. Responde con null si no se menciona.',
      prompt: `Texto de la historia:\n${storyText}`,
    })

    if (!object.origin && !object.residence) return

    const supabase = createAdminClient()
    await supabase
      .from('leads')
      .update({
        origin: object.origin ?? null,
        residence: object.residence ?? null,
      } as never)
      .eq('id', leadId)
  } catch {
    // Fallo silencioso — origin/residence quedan null, no bloquea el flujo
  }
}
