/**
 * Keywords y frases que indican que el cliente terminó de contar su historia.
 * Aprendidas de conversaciones reales con migrantes latinos (corridos/canciones).
 */
const DONE_KEYWORDS = [
  // Explícitos
  'listo',
  'ya',
  'eso es todo',
  'terminé',
  'termine',
  'es todo',
  'eso es',
  'eso sería todo',
  'con eso es todo',
  'con eso basta',
  // Frases naturales de cierre observadas en chats reales
  'le dejo',        // "bueno le dejo esas letras" / "ahí le dejo"
  'dejo eso',
  'ay le dejo',     // variante coloquial
  'ahi le dejo',
  'ahí le dejo',
  'eso quiero',
  'eso es lo que quiero',
  'con eso quiero',
  'eso es mi historia',
  'eso es lo que pasó',
  'bueno así es',
  'bueno, así es',
  'ya le conté',
  'ya te conté',
  'eso está',
  'eso fue todo',
  'se me ocurre',   // "con eso se me ocurre"
  'aver si',        // "aver si ase algo bueno" — señal de que ya entregaron la historia
]

/**
 * Detecta si el mensaje del cliente indica que terminó de contar la historia.
 * Usa keywords simples (sin IA) para no desperdiciar tokens.
 *
 * Patrones aprendidos de conversaciones reales: los clientes raramente dicen "listo"
 * de forma explícita; suelen entregar la historia y esperar que el bot continue.
 *
 * Regla de matching:
 * - Keywords cortos (< 10 chars): solo mensaje exacto.
 *   Evita falsos positivos con 'ya sé', 'ya tengo', 'eso es una historia de...', etc.
 * - Keywords largos (≥ 10 chars): también prefijo / sufijo / contenido interno.
 *   Son suficientemente específicos para no generar ambigüedad.
 */
export function detectStoryDone(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  return DONE_KEYWORDS.some((keyword) => {
    if (normalized === keyword) return true
    if (keyword.length < 10) return false
    return (
      normalized.startsWith(keyword + ' ') ||
      normalized.endsWith(' ' + keyword) ||
      normalized.includes(' ' + keyword + ' ') ||
      normalized.includes('\n' + keyword)
    )
  })
}
