import { createAdminClient } from '@/lib/supabase/admin'
import { submitAudioJob } from './generate-audio'

/**
 * Envía el job a MusicAPI y guarda el task_id en songs.
 * El cron /api/music/poll se encarga de hacer polling y entregar el audio al cliente.
 */
export async function generateAndSendAudioPreview(params: {
  songId: string
  musicPrompt: string
  lyricsText: string
}): Promise<void> {
  const { songId, musicPrompt, lyricsText } = params

  const { taskId } = await submitAudioJob({ musicPrompt, lyricsText })

  const supabase = createAdminClient()
  await supabase
    .from('songs')
    .update({ musicapi_task_id: taskId } as never)
    .eq('id', songId)

  console.log(`[generateAndSendAudioPreview] job submitted — task_id: ${taskId}, song: ${songId}`)
}
