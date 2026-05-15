import type { AvatarWithInsights } from '../services/get-avatars'

export function buildExportJson(avatar: AvatarWithInsights) {
  return {
    avatar_id: avatar.id,
    avatar_name: avatar.name,
    origin: avatar.origin,
    residence: avatar.residence,
    musical_style: avatar.musical_style,
    generated_at: new Date().toISOString(),
    prompt_templates: avatar.proactive_insights.map(i => ({
      insight_id: i.id,
      insight_type: i.insight_type,
      title: i.title,
      confidence: i.confidence,
      classification: i.classification ?? null,
      prompt_template: i.prompt_template ?? null,
    })),
  }
}
