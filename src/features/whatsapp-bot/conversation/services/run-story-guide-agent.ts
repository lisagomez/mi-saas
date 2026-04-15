import { generateText } from 'ai'
import { openrouter, MODELS } from '@/lib/ai/openrouter'

const SYSTEM = `Eres el asistente de un servicio de corridos y canciones personalizadas para migrantes latinos.

Tu rol: analizar la historia que el cliente está contando y decidir si ya es suficiente para componer el corrido, o si necesitas guiarlo para obtener más detalle.

CRITERIOS para historia COMPLETA (deben cumplirse todos):
1. Menciona al menos un nombre propio (persona o lugar significativo)
2. Tiene un contexto narrativo claro — se entiende de qué trata la canción
3. Historia acumulada tiene más de 80 palabras
4. Si hay fechas importantes, tienen año ("en 2019", no solo "el 16 de enero")

CRITERIOS para historia INCOMPLETA:
- Historia muy corta (< 80 palabras acumuladas)
- No hay nombres de personas mencionadas
- El contexto es demasiado vago para componer algo personal
- Hay fechas sin año que cambiarían el significado de la historia

Reglas para el reply cuando la historia está incompleta:
- Máximo 2 oraciones, tono cálido y natural: "primo", "compa", "pa"
- Haz UNA pregunta específica y accionable basada en lo que falta
- Si hay muy poco contenido: anímalo a contar sobre la situación o persona
- Si hay buen contenido pero falta un año o un nombre específico: pide ese dato
- NO preguntes por el estilo musical (corrido, banda, etc.) — eso viene después
- NO digas frases vacías como "cuéntame más" sin especificar qué falta
- NO repitas información que el cliente ya dio

RESPUESTA: Devuelve ÚNICAMENTE un objeto JSON con este formato exacto, sin texto adicional:
Si la historia está COMPLETA: { "action": "complete" }
Si la historia está INCOMPLETA: { "action": "collecting", "reply": "tu mensaje al cliente" }`

export interface StoryGuideResult {
  action: 'collecting' | 'complete'
  reply?: string
}

/**
 * Agente conversacional que guía la recopilación de historia para el corrido.
 * Reemplaza detectStoryDone() + detectMissingDetails() con una sola llamada IA.
 *
 * @returns action='complete'    → historia suficiente, mover a recopilando_estilo
 *          action='collecting' + reply → necesita más detalle, enviar reply al cliente
 *          action='collecting' sin reply → chunk muy corto, silencio apropiado
 */
export async function runStoryGuideAgent(params: {
  storyAccumulated: string
  newMessage: string
  leadMeta: { origin: string | null; residence: string | null }
}): Promise<StoryGuideResult> {
  const { storyAccumulated, newMessage, leadMeta } = params

  const metaNote = leadMeta.origin
    ? `\n(Nota interna: origen/residencia ya capturado: ${leadMeta.origin}${leadMeta.residence ? ` / ${leadMeta.residence}` : ''}. No preguntes por esto.)`
    : ''

  const prompt = `Historia acumulada hasta ahora:
${storyAccumulated.trim() || '(sin historia previa)'}

Nuevo mensaje del cliente:
${newMessage.trim()}${metaNote}`

  const { text } = await generateText({
    model: openrouter(MODELS.basic),
    system: SYSTEM,
    prompt,
    maxOutputTokens: 200,
  })

  console.log('[story-guide-agent] raw response:', text.trim())

  try {
    const parsed = JSON.parse(text.trim()) as { action: string; reply?: string }
    if (parsed.action === 'complete') {
      return { action: 'complete' }
    }
    return { action: 'collecting', reply: parsed.reply }
  } catch {
    // JSON inválido — tratar como collecting sin reply (silencio)
    console.error('[story-guide-agent] JSON parse error, raw:', text.trim())
    return { action: 'collecting' }
  }
}
