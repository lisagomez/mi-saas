import { createAdminClient } from '@/lib/supabase/admin'
import type { CampaignHistory } from '../types/leads'

export async function getCampaignHistory(): Promise<CampaignHistory[]> {
  const admin = createAdminClient()

  const { data: rebuysRaw, error } = await admin
    .from('rebuys')
    .select('promotion_id, sent_at, status')
    .not('promotion_id', 'is', null)
    .order('sent_at', { ascending: false })

  if (error || !rebuysRaw) return []

  const rebuys = rebuysRaw as Array<{ promotion_id: string; sent_at: string; status: string }>
  const promotionIds = [...new Set(rebuys.map((r) => r.promotion_id))]

  if (promotionIds.length === 0) return []

  const { data: promosRaw } = await admin
    .from('promotions_catalog')
    .select('id, name')
    .in('id', promotionIds)

  const promoNames = new Map<string, string>(
    ((promosRaw ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name])
  )

  // Group by (promotion_id, day)
  const groups = new Map<string, { promotionId: string; sentAt: string; total: number; sent: number; failed: number }>()

  for (const r of rebuys) {
    const day = r.sent_at.split('T')[0]
    const key = `${r.promotion_id}_${day}`
    const existing = groups.get(key)
    if (!existing) {
      groups.set(key, {
        promotionId: r.promotion_id,
        sentAt: r.sent_at,
        total: 1,
        sent: r.status === 'sent' ? 1 : 0,
        failed: r.status === 'failed' ? 1 : 0,
      })
    } else {
      existing.total++
      if (r.status === 'sent') existing.sent++
      else existing.failed++
    }
  }

  return Array.from(groups.entries()).map(([key, g]) => ({
    key,
    promotionId: g.promotionId,
    promotionName: promoNames.get(g.promotionId) ?? 'Promoción eliminada',
    sentAt: g.sentAt,
    total: g.total,
    sent: g.sent,
    failed: g.failed,
  }))
}
