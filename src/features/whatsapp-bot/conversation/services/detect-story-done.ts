/** Keywords que indican que el cliente terminó de contar su historia. */
const DONE_KEYWORDS = ['listo', 'ya', 'eso es todo', 'terminé', 'termine', 'es todo', 'eso es']

/**
 * Detecta si el mensaje del cliente indica que terminó de contar la historia.
 * Usa keywords simples (sin IA) para no desperdiciar tokens.
 */
export function detectStoryDone(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  return DONE_KEYWORDS.some((keyword) => normalized === keyword || normalized.startsWith(keyword + ' ') || normalized.endsWith(' ' + keyword))
}
