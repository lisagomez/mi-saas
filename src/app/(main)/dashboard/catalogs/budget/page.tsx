import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BudgetPanel } from '@/features/catalogs/components/BudgetPanel'
import { getMonthlySpend } from '@/features/catalogs/services/get-monthly-spend'
import type { Budget, Expense } from '@/types/database'
import Link from 'next/link'

export default async function BudgetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'administrador') redirect('/dashboard')
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const [{ data: budgets }, { data: expenses }, monthlyAiSpend] = await Promise.all([
    admin.from('budgets').select('*').order('category'),
    admin.from('expenses').select('*').gte('expense_date', startOfMonth).order('expense_date', { ascending: false }),
    getMonthlySpend(),
  ])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard/catalogs" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          ← Catálogos
        </Link>
        <BudgetPanel
          budgets={(budgets ?? []) as Budget[]}
          expenses={(expenses ?? []) as Expense[]}
          monthlyAiSpend={monthlyAiSpend}
        />
      </div>
    </div>
  )
}
