import { generateText } from 'ai'
import { openrouter, MODELS } from '@/lib/ai/openrouter'

const SYSTEM = `Eres un compositor de corridos y canciones personalizadas en español.
Analizas la historia del cliente e identificas los detalles faltantes que hacen la canción más auténtica y personal.

Busca específicamente (en orden de importancia):
1. Fechas mencionadas sin año → preguntar el año exacto (ej: "el 16 de enero" → ¿de qué año?)
2. Apodos o sobrenombres que necesitan aclaración → ¿cómo quiere que lo llamen en la canción? (ej: "el Fily" → ¿solo "Fily", "el Fily" o "el Compa Fily"?)
3. Personas mencionadas que merecen ser nombradas pero no tienen nombre claro
4. Lugar de nacimiento/origen si NO aparece en la historia y el origen del lead no está disponible

Reglas:
- Si la historia tiene suficiente detalle (nombres claros, contexto completo, sin fechas ambiguas), responde exactamente: COMPLETO
- Si faltan detalles, formula MÁXIMO 2 preguntas cortas, directas, en tono amigable (primo/compa)
- No preguntes por el estilo musical (eso ya se preguntó aparte)
- No preguntes si la historia está "correcta" de forma genérica
- No preguntes más de lo necesario — cada pregunta innecesaria aleja al cliente`

/**
 * Analiza la historia del cliente con IA e identifica detalles faltantes
 * que enriquecerían la letra del corrido.
 *
 * @returns String con 1-2 preguntas de aclaración, o null si la historia es suficiente.
 */
export async function detectMissingDetails(
  storyText: string,
  origin: string | null
): Promise<string | null> {
  // Historia muy corta → no gastar tokens, dejar que la IA genere con lo que hay
  if (storyText.trim().length < 80) return null

  const context = origin
    ? `Historia del cliente:\n${storyText}\n\n(Nota: el origen/residencia del lead ya fue capturado internamente: ${origin}. No preguntes por esto.)`
    : `Historia del cliente:\n${storyText}`

  const { text } = await generateText({
    model: openrouter(MODELS.basic),
    system: SYSTEM,
    prompt: context,
    maxOutputTokens: 150,
  })

  const response = text.trim()
  if (!response || response.startsWith('COMPLETO')) return null
  return response
}
