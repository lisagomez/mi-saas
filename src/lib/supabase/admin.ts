import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Cliente Supabase con service_role. Solo usar en API routes / Server Actions
 * que necesitan bypass de RLS (ej. webhook WhatsApp, inserción en leads/conversations).
 * Tipado con Database; si hay errores de inferencia en tablas nuevas, usar supabase gen types.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}
