import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Cuenta cuántos mensajes ha enviado el usuario (role=user) para este lead.
 * Se usa para decidir "cuándo" ejecutar el calificador (ej. al menos 1 mensaje del usuario).
 */
export async function countUserMessages(leadId: string): Promise<number> {
  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('role', 'user')

  if (error) throw new Error(`countUserMessages: ${error.message}`)
  return count ?? 0
}
