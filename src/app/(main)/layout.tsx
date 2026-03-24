import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardShell } from '@/components/DashboardShell'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = ((profile as { role: string } | null)?.role ?? null) as 'creativo' | 'agente_investigador' | 'admin_pagos' | 'administrador' | null

  return (
    <DashboardShell email={user.email ?? ''} role={role}>
      {children}
    </DashboardShell>
  )
}
