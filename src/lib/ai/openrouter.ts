import { createOpenRouter } from '@openrouter/ai-sdk-provider'

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

export const MODELS = {
  /** Modelo económico para calificación, extracción, tareas simples */
  basic: 'openai/gpt-4o-mini',
  fast: 'google/gemini-2.0-flash-001',
  balanced: 'openai/gpt-4o',
  powerful: 'openai/gpt-4o',
  vision: 'google/gemini-2.0-flash-001',
} as const

export type ModelKey = keyof typeof MODELS

/** Costo por token vía OpenRouter (actualizar aquí cuando cambien los precios). */
export const MODEL_COSTS: Record<string, { inputPerToken: number; outputPerToken: number }> = {
  'openai/gpt-4o':      { inputPerToken: 0.0000025,  outputPerToken: 0.00001   }, // $2.50 / $10.00 por 1M
  'openai/gpt-4o-mini': { inputPerToken: 0.00000015, outputPerToken: 0.0000006 }, // $0.15 / $0.60 por 1M
  'google/gemini-2.0-flash-001': { inputPerToken: 0.0000001, outputPerToken: 0.0000004 }, // $0.10 / $0.40 por 1M
}

/** Calcula el costo estimado de una llamada. Retorna null si el modelo no tiene tarifa registrada. */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number | null {
  const rates = MODEL_COSTS[model]
  if (!rates) return null
  return inputTokens * rates.inputPerToken + outputTokens * rates.outputPerToken
}
