import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApprovedPostsWithPieces } from '@/features/content-generator/services/get-approved-posts-with-pieces'
import { ContentGeneratorView } from '@/features/content-generator/components/ContentGeneratorView'

export default async function ContentGeneratorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles').select('role').eq('id', user.id).single()
  const role = (profileData as { role: string } | null)?.role ?? null

  if (role !== 'administrador') redirect('/dashboard')

  const posts = await getApprovedPostsWithPieces()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ContentGeneratorView initialPosts={posts} />
    </div>
  )
}
