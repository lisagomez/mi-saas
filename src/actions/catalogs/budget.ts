'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const BudgetSchema = z.object({
  category: z.enum(['ai_tokens', 'marketing', 'suscripciones', 'operacion']),
  period_month: z.string().min(1),
  limit_usd: z.number().min(0).nullable(),
  limit_mxn: z.number().min(0).nullable(),
  notes: z.string().optional(),
})

const ExpenseSchema = z.object({
  category: z.enum(['marketing', 'suscripciones', 'operacion']),
  description: z.string().min(1),
  amount_mxn: z.number().min(0),
  expense_date: z.string().min(1),
})

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'administrador') throw new Error('Sin permiso')
  return user.id
}

export async function upsertBudget(input: z.infer<typeof BudgetSchema>) {
  await assertAdmin()
  const data = BudgetSchema.parse(input)
  const admin = createAdminClient()
  const { error } = await admin.from('budgets').upsert(
    { ...data, updated_at: new Date().toISOString() } as never,
    { onConflict: 'category,period_month' }
  )
  if (error) return { error: error.message }
  revalidatePath('/dashboard/catalogs/budget')
  return { success: true }
}

export async function createExpense(input: z.infer<typeof ExpenseSchema>) {
  const userId = await assertAdmin()
  const data = ExpenseSchema.parse(input)
  const admin = createAdminClient()
  const { error } = await admin.from('expenses').insert({ ...data, created_by: userId } as never)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/catalogs/budget')
  return { success: true }
}

export async function deleteExpense(id: string) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('expenses').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/catalogs/budget')
  return { success: true }
}
