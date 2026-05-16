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
