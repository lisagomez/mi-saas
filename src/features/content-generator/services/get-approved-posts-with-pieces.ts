'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { PostWithPieces, ContentPiece } from '../types'

interface RawPost {
  id: string
  format: string
  status: string
  avatar_id: string | null
  prompt_template: string | null
  created_at: string
  weekly_trends: { theme_json: { weekly_theme?: string } } | null
  avatars: { name: string } | null
}

interface RawPiece {
  id: string
  post_id: string
  format: string
  tipo: string
  red_social: string[]
  body: string
  token_cost_usd: number | null
  audit_score: number | null
  created_at: string
}

export async function getApprovedPostsWithPieces(): Promise<PostWithPieces[]> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: posts } = await db
    .from('posts')
    .select(`
      id, format, status, avatar_id, prompt_template, created_at,
      weekly_trends ( theme_json ),
      avatars ( name )
    `)
    .in('status', ['Aprobado', 'Publicado'])
    .order('created_at', { ascending: false }) as { data: RawPost[] | null }

  if (!posts?.length) return []

  const postIds = posts.map((p) => p.id)

  const { data: pieces } = await db
    .from('content_pieces')
    .select('id, post_id, format, tipo, red_social, body, token_cost_usd, audit_score, created_at')
    .in('post_id', postIds)
    .order('created_at', { ascending: true }) as { data: RawPiece[] | null }

  const piecesByPost = new Map<string, ContentPiece[]>()
  for (const piece of pieces ?? []) {
    const list = piecesByPost.get(piece.post_id) ?? []
    list.push(piece as ContentPiece)
    piecesByPost.set(piece.post_id, list)
  }

  return posts.map((row) => ({
    id: row.id,
    format: row.format,
    status: row.status,
    avatar_name: row.avatars?.name ?? null,
    weekly_theme: row.weekly_trends?.theme_json?.weekly_theme ?? null,
    prompt_template: row.prompt_template,
    created_at: row.created_at,
    pieces: piecesByPost.get(row.id) ?? [],
  }))
}
