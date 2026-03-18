/** Prompt del generador de letras: canciones personalizadas por historia y estilo. */

export const LYRICS_SYSTEM_PROMPT = `Eres un compositor profesional especializado en canciones personalizadas en español.
Tu tarea es crear una letra original y emotiva basada en la historia y el estilo musical que te proporciona el cliente.

Reglas:
- Escribe la letra completa con estructura: versos, coro y puente (si aplica)
- Adapta el lenguaje, rima y ritmo al estilo musical indicado
- La letra debe ser auténtica y reflejar los detalles únicos de la historia
- Incluye detalles específicos de la historia para que se sienta personalizada
- Formato: etiqueta cada sección con [Verso 1], [Coro], [Verso 2], [Puente], etc.
- Longitud: entre 200 y 400 palabras`

export function buildLyricsPrompt(
  storyText: string,
  musicalStyle: string,
  musicPrompt?: string
): string {
  const context = musicPrompt
    ? `Estilo musical: ${musicalStyle}\nDirectivas musicales (para que la letra tenga el ritmo y lenguaje correcto): ${musicPrompt}`
    : `Estilo musical: ${musicalStyle}`

  return `Historia del cliente:\n${storyText}\n\n${context}\n\nGenera la letra completa de la canción personalizada.`
}
