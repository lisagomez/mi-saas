import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Concatena un nuevo chunk de historia al story_text existente del order.
 * Si story_text es null (primer mensaje), lo inicializa con el chunk.
 */
export async function appendStoryChunk(orderId: string, chunk: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: current, error: fetchError } = await supabase
    .from('orders')
    .select('story_text')
    .eq('id', orderId)
    .single()

  if (fetchError) throw new Error(`appendStoryChunk fetch: ${fetchError.message}`)

  const existing = (current as { story_text: string | null }).story_text
  const updated = existing ? `${existing}\n${chunk}` : chunk

  const { error } = await supabase
    .from('orders')
    .update({ story_text: updated, updated_at: new Date().toISOString() } as never)
    .eq('id', orderId)

  if (error) throw new Error(`appendStoryChunk update: ${error.message}`)
}
