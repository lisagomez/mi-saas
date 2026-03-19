import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PromotionsPanel } from '@/features/catalogs/components/PromotionsPanel'
import type { PromotionsCatalog } from '@/types/database'
import Link from 'next/link'

export default async function PromotionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'administrador') redirect('/dashboard')

  const admin = createAdminClient()
  const { data: promotions } = await admin
    .from('promotions_catalog')
    .select('*')
    .order('valid_from', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard/catalogs" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          ← Catálogos
        </Link>
        <PromotionsPanel promotions={(promotions ?? []) as PromotionsCatalog[]} />
      </div>
    </div>
  )
}
