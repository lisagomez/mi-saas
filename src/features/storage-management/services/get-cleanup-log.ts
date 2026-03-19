import { createAdminClient } from '@/lib/supabase/admin'
import type { StorageCleanupLog } from '@/types/database'

export async function getCleanupLog(limit = 10): Promise<StorageCleanupLog[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('storage_cleanup_log')
    .select('*')
    .order('ran_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getCleanupLog: ${error.message}`)
  return (data ?? []) as StorageCleanupLog[]
}
