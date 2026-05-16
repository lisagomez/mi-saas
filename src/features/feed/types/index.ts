export type PostStatus = 'Ideado' | 'Generado' | 'Aprobado' | 'Publicado'

export interface Post {
  id: string
  weekly_theme_id: string | null
  avatar_id: string | null
  format: string
  status: PostStatus
  prompt_template: string | null
  body: string | null
  notes: string | null
  created_at: string
  weekly_theme: string | null
  avatar_name: string | null
}

export type TrendStatus = 'running' | 'success' | 'error'

export interface TrendLog {
  id: string
  avatar_name: string | null
  theme_json: Record<string, unknown>
  reasoning: string
  status: TrendStatus
  error_message: string | null
  execution_ms: number | null
  source: string
  created_at: string
}
