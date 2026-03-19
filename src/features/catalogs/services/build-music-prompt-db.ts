import { createAdminClient } from '@/lib/supabase/admin'
import { buildMusicPrompt } from '@/features/orders/prompts/music-prompt'
import type { PreferencesCatalog } from '@/types/database'

/**
 * Genera las directivas musicales consultando preferences_catalog en DB.
 * Misma lógica de matching que buildMusicPrompt (region + estilo → solo estilo → fallback).
 * Si la DB falla o devuelve vacío, cae al array hardcodeado como fallback.
 */
export async function buildMusicPromptDb(
  style: string,
  origin: string | null,
  residence: string | null
): Promise<string> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('preferences_catalog')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error || !data || data.length === 0) {
      return buildMusicPrompt(style, origin, residence)
    }

    const styleLow = style.toLowerCase()
    const locationLow = [origin, residence].filter(Boolean).join(' ').toLowerCase()

    const catalog = data as PreferencesCatalog[]

    // Match región + estilo
    const regionStyleMatch = catalog.find(
      (entry) =>
        entry.regions.length > 0 &&
        entry.regions.some((r) => locationLow.includes(r)) &&
        entry.styles.some((s) => styleLow.includes(s))
    )
    if (regionStyleMatch) return regionStyleMatch.directives

    // Solo estilo
    const styleOnlyMatch = catalog.find((entry) =>
      entry.styles.some((s) => styleLow.includes(s))
    )
    if (styleOnlyMatch) return styleOnlyMatch.directives

    // Fallback hardcodeado
    return buildMusicPrompt(style, origin, residence)
  } catch {
    return buildMusicPrompt(style, origin, residence)
  }
}
