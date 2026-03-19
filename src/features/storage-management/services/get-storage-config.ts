import { createAdminClient } from '@/lib/supabase/admin'
import type { StorageConfig } from '@/types/database'

const BUCKET_NAMES = ['songs', 'order-photos', 'videos', 'payment-proofs'] as const
export type BucketName = typeof BUCKET_NAMES[number]

export async function getStorageConfig(): Promise<StorageConfig[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('storage_config')
    .select('*')
    .order('bucket_name')

  if (error) throw new Error(`getStorageConfig: ${error.message}`)
  return (data ?? []) as StorageConfig[]
}

export function getConfigForBucket(configs: StorageConfig[], bucketName: string): StorageConfig | undefined {
  return configs.find(c => c.bucket_name === bucketName)
}
