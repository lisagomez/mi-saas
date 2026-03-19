import { generateText } from 'ai'
import { openrouter, MODELS } from '@/lib/ai/openrouter'

const OCCASION_KEYS = [
  'cumpleanos',
  'cumpleanos_madre',
  'cumpleanos_padre',
  'boda',
  'aniversario',
  'dia_madres',
  'dia_padres',
  'quinceanera',
  'graduacion',
  'navidad',
  'otro',
] as const

export type OccasionKey = (typeof OCCASION_KEYS)[number]

const SYSTEM_PROMPT = `Eres un extractor de ocasiones especiales.
Dado un texto en español, identifica cuál es la ocasión especial mencionada.
Responde SOLO con una de estas claves (sin explicación, sin puntuación):
cumpleanos | cumpleanos_madre | cumpleanos_padre | boda | aniversario | dia_madres | dia_padres | quinceanera | graduacion | navidad | otro

Si no hay ocasión especial clara, responde: otro`

/**
 * Detecta la ocasión especial en el texto del cliente usando el modelo básico (económico).
 * Retorna null si la llamada IA falla para no bloquear el flujo.
 */
export async function detectOccasion(text: string): Promise<OccasionKey | null> {
  try {
    const { text: result } = await generateText({
      model: openrouter(MODELS.basic),
      system: SYSTEM_PROMPT,
      prompt: text,
    })

    const key = result.trim().toLowerCase() as OccasionKey
    return OCCASION_KEYS.includes(key) ? key : 'otro'
  } catch (err) {
    console.error('detectOccasion error:', err)
    return null
  }
}
