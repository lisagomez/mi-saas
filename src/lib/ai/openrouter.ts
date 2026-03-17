import { createOpenRouter } from '@openrouter/ai-sdk-provider'

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

export const MODELS = {
  /** Modelo económico para calificación, extracción, tareas simples */
  basic: 'openai/gpt-4o-mini',
  fast: 'google/gemini-2.0-flash-exp:free',
  balanced: 'anthropic/claude-3-5-sonnet',
  powerful: 'anthropic/claude-3-5-sonnet',
  vision: 'google/gemini-2.0-flash-exp:free',
} as const

export type ModelKey = keyof typeof MODELS
