import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

export interface StoreMessageParams {
  leadId: string
  role: 'user' | 'assistant'
  contentText?: string | null
  contentAudioUrl?: string | null
  messageIdWhatsApp?: string | null
}

type ConversationInsert = Database['public']['Tables']['conversations']['Insert']

/**
 * Persiste un mensaje de la conversación WhatsApp en la tabla conversations.
 * Usar desde el webhook con el cliente admin (service_role).
 */
export async function storeMessage(params: StoreMessageParams): Promise<{ id: string }> {
  const supabase = createAdminClient()
  const row: ConversationInsert = {
    lead_id: params.leadId,
    role: params.role,
    content_text: params.contentText ?? null,
    content_audio_url: params.contentAudioUrl ?? null,
    message_id_whatsapp: params.messageIdWhatsApp ?? null,
  }
  const { data, error } = await supabase
    .from('conversations')
    .insert(row as never)
    .select('id')
    .single()

  if (error) throw new Error(`storeMessage: ${error.message}`)
  return { id: (data as { id: string }).id }
}
