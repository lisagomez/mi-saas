import { createAdminClient } from '@/lib/supabase/admin'

export interface BucketStats {
  bucket: string
  files: number
  sizeMb: number
}

const BUCKETS = ['songs', 'order-photos', 'videos', 'payment-proofs'] as const

interface StorageObject {
  name: string
  metadata?: { size?: number } | null
}

/**
 * Calcula uso real de storage listando objetos de cada bucket.
 * Pagina en bloques de 1000 para proyectos con muchos archivos.
 */
async function getBucketStats(bucketName: string): Promise<BucketStats> {
  const admin = createAdminClient()
  let files = 0
  let totalBytes = 0
  let offset = 0
  const limit = 1000

  while (true) {
    const { data, error } = await admin.storage
      .from(bucketName)
      .list('', { limit, offset, sortBy: { column: 'name', order: 'asc' } })

    if (error || !data || data.length === 0) break

    for (const obj of data as StorageObject[]) {
      if (obj.metadata?.size) {
        totalBytes += obj.metadata.size
        files++
      }
    }

    if (data.length < limit) break
    offset += limit
  }

  return {
    bucket: bucketName,
    files,
    sizeMb: totalBytes / (1024 * 1024),
  }
}

export async function getStorageStats(): Promise<BucketStats[]> {
  return Promise.all(BUCKETS.map(b => getBucketStats(b)))
}
