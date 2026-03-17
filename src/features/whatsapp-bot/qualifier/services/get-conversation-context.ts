import { createAdminClient } from '@/lib/supabase/admin'

const MAX_MESSAGES = 20

/**
 * Obtiene los últimos mensajes de la conversación del lead en formato texto
 * para enviar al calificador (user: ... / assistant: ...).
 */
export async function getConversationContext(leadId: string): Promise<string> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('conversations')
    .select('role, content_text')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })
    .limit(MAX_MESSAGES)

  if (error) throw new Error(`getConversationContext: ${error.message}`)
  if (!data?.length) return ''

  const rows = data as Array<{ role: string; content_text: string | null }>
  return rows
    .map((row) => {
      const role = row.role === 'user' ? 'Cliente' : 'Asistente'
      const text = row.content_text?.trim() || '(sin texto)'
      return `${role}: ${text}`
    })
    .join('\n')
}
