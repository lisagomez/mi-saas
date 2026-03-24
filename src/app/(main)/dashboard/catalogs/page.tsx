import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

const CATALOG_CARDS = [
  {
    href: '/dashboard/catalogs/promotions',
    title: '🎉 Promociones',
    description: 'Crea y gestiona promociones por ocasión especial. El bot las menciona automáticamente cuando detecta la ocasión del cliente.',
    color: 'bg-purple-50 border-purple-200',
  },
  {
    href: '/dashboard/catalogs/preferences',
    title: '🎵 Preferencias Musicales',
    description: 'Catálogo de estilos musicales por región. Controla las directivas que se usan para generar la canción.',
    color: 'bg-blue-50 border-blue-200',
  },
  {
    href: '/dashboard/catalogs/budget',
    title: '💰 Presupuesto',
    description: 'Configura límites de gasto por categoría. El sistema bloquea llamadas IA cuando se supera el límite mensual.',
    color: 'bg-green-50 border-green-200',
  },
  {
    href: '/dashboard/catalogs/business-domain',
    title: '📊 Dominio de Negocio',
    description: 'Fórmulas y benchmarks usados por el Agente Financiero para calcular métricas sin alucinaciones.',
    color: 'bg-orange-50 border-orange-200',
  },
]

export default async function CatalogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'administrador') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Catálogos</h1>
          <p className="text-gray-500 mt-1">Configura los catálogos que alimentan al bot y los agentes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATALOG_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`block p-6 rounded-xl border-2 ${card.color} hover:shadow-md transition-shadow`}
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h2>
              <p className="text-sm text-gray-600">{card.description}</p>
              <span className="mt-4 inline-block text-sm font-medium text-gray-700 underline">
                Gestionar →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
