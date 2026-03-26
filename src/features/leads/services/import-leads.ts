'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface ImportLeadsResult {
  imported: number
  skipped: number
  invalid: number
}

export async function importLeads(phones: string[]): Promise<ImportLeadsResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const admin = createAdminClient()

  // Normalizar y validar números
  const validPhones = [...new Set(
    phones
      .map((p) => p.replace(/\s/g, '').replace(/[^\d+]/g, ''))
      .filter((p) => /^\+?\d{10,15}$/.test(p))
      .map((p) => p.startsWith('+') ? p : `+${p}`)
  )]

  const invalid = phones.length - validPhones.length

  if (validPhones.length === 0) return { imported: 0, skipped: 0, invalid }

  // Obtener los que ya existen
  const { data: existing } = await admin
    .from('leads')
    .select('phone')
    .in('phone', validPhones)

  const existingSet = new Set((existing ?? []).map((r) => (r as { phone: string }).phone))
  const toInsert = validPhones.filter((p) => !existingSet.has(p))
  const skipped = validPhones.length - toInsert.length

  if (toInsert.length === 0) return { imported: 0, skipped, invalid }

  await admin
    .from('leads')
    .insert(toInsert.map((phone) => ({ phone, source: 'wab_import' })) as never)

  return { imported: toInsert.length, skipped, invalid }
}
