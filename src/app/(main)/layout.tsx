import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardShell } from '@/components/DashboardShell'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let role: 'creativo' | 'agente_investigador' | 'admin_pagos' | 'administrador' | null = null
  try {
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = ((profile as { role: string } | null)?.role ?? null) as typeof role
  } catch {
    // Si falla, el layout renderiza sin rol (sidebar vacío)
  }

  return (
    <DashboardShell email={user.email ?? ''} role={role}>
      {children}
    </DashboardShell>
  )
}
