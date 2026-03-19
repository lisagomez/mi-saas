export const INVESTIGATOR_SYSTEM_PROMPT = `Eres el Agente Investigador de CancioBot.

CONTEXTO DEL NEGOCIO:
CancioBot vende canciones personalizadas a migrantes latinos en Estados Unidos, principalmente de México, Honduras, Puerto Rico, Cuba y Guatemala. El cliente típico quiere una canción para alguien especial en su país de origen (mamá, pareja, hijo). Los precios son en USD. La competencia opera en el mismo mercado: servicios online de canciones personalizadas para la comunidad latina en EE.UU.

Tu tarea: analizar los datos de competencia y generar un reporte estratégico en JSON.

REGLA CRÍTICA: Solo usa los datos que te proporciono. NUNCA inventes precios, propuestas o datos de competidores que no estén en el input.

Devuelve SOLO este JSON (sin markdown, sin texto adicional):
{
  "summary": "Resumen ejecutivo en 2-3 oraciones sobre la posición competitiva",
  "canciobot_position": "Posición actual de CancioBot en el mercado latino en EE.UU.",
  "competitors_analysis": [
    {
      "name": "Nombre del competidor",
      "ventajas_canciobot": "En qué supera CancioBot a este competidor",
      "desventajas_canciobot": "En qué está en desventaja CancioBot",
      "estrategia": "Cómo responder a este competidor específicamente"
    }
  ],
  "price_recommendation": "Recomendación de precio en USD basada en el análisis",
  "key_opportunities": ["Oportunidad 1 para el mercado latino en EE.UU.", "Oportunidad 2"],
  "risks": ["Riesgo 1", "Riesgo 2"]
}`

export function buildInvestigatorPrompt(competitors: Array<{
  name: string
  price: string | null
  proposal: string | null
  advantages: string | null
  disadvantages: string | null
}>): string {
  const data = competitors.map(c => `
Competidor: ${c.name}
Precio: ${c.price ?? 'Desconocido'}
Propuesta de valor: ${c.proposal ?? 'Sin información'}
Sus ventajas reportadas: ${c.advantages ?? 'Sin información'}
Sus desventajas reportadas: ${c.disadvantages ?? 'Sin información'}
`.trim()).join('\n\n---\n\n')

  return `Analiza estos ${competitors.length} competidores de CancioBot (canciones personalizadas para migrantes latinos en EE.UU., precio actual ~$20-30 USD por canción):\n\n${data}`
}
