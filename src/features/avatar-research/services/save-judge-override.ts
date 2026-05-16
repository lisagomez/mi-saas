'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export interface SaveOverrideInput {
  avatarId: string
  suggestedId: string   // el insight que el Judge puso primero
  chosenId: string      // el insight que la usuaria eligió
  reasonText?: string
}

export async function saveJudgeOverride(input: SaveOverrideInput): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()

  // 1. Registrar el override
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (admin as any)
    .from('judge_overrides')
    .insert({
      avatar_id: input.avatarId,
      suggested_id: input.suggestedId,
      chosen_id: input.chosenId,
      reason_text: input.reasonText ?? null,
    })

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  // 2. Invalidar cache del Judge para este avatar
  // Borrar filas de judge_rankings del avatar → el próximo load recalcula
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('judge_rankings')
    .delete()
    .eq('avatar_id', input.avatarId)

  // 3. Revalidar la página para que el nuevo load dispare el recálculo en background
  revalidatePath('/avatar-research')

  return { success: true }
}
