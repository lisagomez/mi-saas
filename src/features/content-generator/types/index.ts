export type ContentTipo = 'organico' | 'pauta'

export interface ContentPiece {
  id: string
  post_id: string
  format: string
  tipo: ContentTipo
  red_social: string[]
  body: string
  token_cost_usd: number | null
  audit_score: number | null
  created_at: string
}

export interface PostWithPieces {
  id: string
  format: string
  status: string
  avatar_name: string | null
  weekly_theme: string | null
  prompt_template: string | null
  created_at: string
  pieces: ContentPiece[]
}
