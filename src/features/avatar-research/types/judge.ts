export interface JudgeRanking {
  insight_id: string
  rank: number
  score_judge: number
  reasoning: string
  override_count: number
}

export interface JudgeRankingRow {
  id: string
  avatar_id: string
  insight_id: string
  rank: number
  score_judge: number
  reasoning: string
  computed_at: string
  override_count: number
}

export interface JudgeOverride {
  id: string
  avatar_id: string
  suggested_id: string
  chosen_id: string
  reason_text: string | null
  created_at: string
}
