'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PostStatus } from '../types'

export async function updatePostStatus(postId: string, status: PostStatus): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('posts')
    .update({ status })
    .eq('id', postId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/feed')
  return { success: true }
}
