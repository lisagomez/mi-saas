import { generateObject, zodSchema } from 'ai'
import { openrouter, MODELS } from '@/lib/ai/openrouter'
import {
  buildQualifierPrompt,
  QUALIFIER_SYSTEM_PROMPT,
} from '../prompts/qualifier-prompt'
import type { QualifierResult } from '../types/qualifier-result'
import { QualifierResultSchema } from '../types/qualifier-result'

export interface RunQualifierParams {
  /** Historial reciente de la conversación en texto (mensajes user/assistant). */
  conversationText: string
}

export interface RunQualifierOutput {
  result: QualifierResult
  usage?: { promptTokens: number; completionTokens: number }
}

/**
 * Ejecuta el agente calificador con OpenRouter (modelo económico).
 * Devuelve { qualified, reason? } para decidir si el lead sigue el flujo o va a nurturing.
 */
export async function runQualifier(
  params: RunQualifierParams
): Promise<RunQualifierOutput> {
  const prompt = buildQualifierPrompt(params.conversationText)

  const { object, usage } = await generateObject({
    model: openrouter(MODELS.basic),
    schema: zodSchema(QualifierResultSchema),
    system: QUALIFIER_SYSTEM_PROMPT,
    prompt,
  })

  return {
    result: object,
    usage: usage
      ? {
          promptTokens: usage.inputTokens ?? 0,
          completionTokens: usage.outputTokens ?? 0,
        }
      : undefined,
  }
}
