import { NextRequest, NextResponse } from 'next/server'
import { runStorageCleanup } from '@/features/storage-management/services/run-storage-cleanup'

/**
 * POST /api/storage/cleanup
 *
 * Endpoint para limpieza automática de storage. Protegido con CRON_SECRET.
 * Puede ser invocado por:
 * - Vercel Cron (con Authorization header)
 * - Panel de administración (limpieza manual)
 *
 * Vercel cron config en vercel.json:
 * { "crons": [{ "path": "/api/storage/cleanup", "schedule": "0 3 * * *" }] }
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET

  // Validar CRON_SECRET si está configurado
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (token !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Determinar si es manual (viene del dashboard) o cron
  let triggeredBy: 'cron' | 'manual' = 'cron'
  try {
    const body = await request.json() as { triggered_by?: string }
    if (body.triggered_by === 'manual') triggeredBy = 'manual'
  } catch {
    // Body vacío o no JSON — asumir cron
  }

  try {
    const result = await runStorageCleanup(triggeredBy)
    return NextResponse.json({
      ok: true,
      deleted_files: result.deletedFiles,
      freed_mb: result.freedMb.toFixed(2),
      triggered_by: triggeredBy,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
