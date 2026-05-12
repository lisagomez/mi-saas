import { createClient } from '@/lib/supabase/client'
import type { AppGroup, AppItem } from '../types'

export async function getAppGroups(): Promise<AppGroup[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('app_launcher_registry')
    .select('key, label, icon, href, external, category, category_order, sort_order')
    .eq('enabled', true)
    .order('category_order', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error || !data) return []

  const grouped = new Map<string, { order: number; apps: AppItem[] }>()

  for (const row of data) {
    if (!grouped.has(row.category)) {
      grouped.set(row.category, { order: row.category_order, apps: [] })
    }
    grouped.get(row.category)!.apps.push({
      key: row.key,
      label: row.label,
      icon: row.icon,
      href: row.href,
      external: row.external ?? false,
    })
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[1].order - b[1].order)
    .map(([label, { apps }]) => ({ label, apps }))
}
