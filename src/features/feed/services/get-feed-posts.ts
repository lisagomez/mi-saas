'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { Post } from '../types'

interface RawPost {
  id: string
  weekly_theme_id: string | null
  avatar_id: string | null
  format: string
  status: string
  prompt_template: string | null
  body: string | null
  notes: string | null
  created_at: string
  weekly_trends: { theme_json: { weekly_theme?: string } } | null
  avatars: { name: string } | null
}

export async function getFeedPosts(): Promise<Post[]> {
  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('posts')
    .select(`
      id, weekly_theme_id, avatar_id, format, status, prompt_template, body, notes, created_at,
      weekly_trends ( theme_json ),
      avatars ( name )
    `)
    .order('created_at', { ascending: false }) as { data: RawPost[] | null; error: unknown }

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    weekly_theme_id: row.weekly_theme_id,
    avatar_id: row.avatar_id,
    format: row.format,
    status: row.status as Post['status'],
    prompt_template: row.prompt_template,
    body: row.body,
    notes: row.notes,
    created_at: row.created_at,
    weekly_theme: row.weekly_trends?.theme_json?.weekly_theme ?? null,
    avatar_name: row.avatars?.name ?? null,
  }))
}
