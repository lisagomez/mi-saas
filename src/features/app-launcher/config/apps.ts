import type { AppGroup } from '../types'

export const APP_GROUPS: AppGroup[] = [
  {
    label: 'Dashboard',
    apps: [
      { key: 'letras',       label: 'Letras',        icon: '🎵', href: '/dashboard?tab=letras' },
      { key: 'competencia',  label: 'Investigador',  icon: '🔍', href: '/investigador' },
      { key: 'financiero',   label: 'Financiero',    icon: '📊', href: '/dashboard?tab=financiero' },
      { key: 'pagos',        label: 'Pagos',         icon: '💳', href: '/dashboard?tab=pagos' },
      { key: 'videos',       label: 'Videos',        icon: '🎬', href: '/dashboard?tab=videos' },
      { key: 'leads',        label: 'Leads',         icon: '👥', href: '/dashboard?tab=leads' },
      { key: 'precios',      label: 'Precios',       icon: '💰', href: '/dashboard?tab=precios' },
      { key: 'facebook-ads', label: 'Facebook Ads',  icon: '📣', href: '/dashboard?tab=facebook-ads' },
      { key: 'storage',      label: 'Storage',       icon: '💾', href: '/dashboard?tab=storage' },
      { key: 'agentes',      label: 'Agentes',       icon: '🤖', href: '/dashboard?tab=agentes' },
    ],
  },
  {
    label: 'Estrategia',
    apps: [
      { key: 'avatar-research',    label: 'Avatares',   icon: '🧑‍🤝‍🧑', href: '/avatar-research' },
      { key: 'feed',               label: 'Feed',        icon: '📅',       href: '/feed' },
      { key: 'content-generator',  label: 'Contenido',   icon: '✨',       href: '/content-generator' },
    ],
  },
  {
    label: 'Catálogos',
    apps: [
      { key: 'catalogos',    label: 'Catálogos',     icon: '📋', href: '/dashboard/catalogs' },
    ],
  },
  {
    label: 'Herramientas',
    apps: [
      { key: 'supabase', label: 'Supabase', icon: '🗄️', href: 'https://supabase.com/dashboard', external: true },
      { key: 'vercel',   label: 'Vercel',   icon: '🚀', href: 'https://vercel.com/dashboard',   external: true },
      { key: 'whatsapp', label: 'WhatsApp', icon: '📱', href: 'https://business.facebook.com',  external: true },
    ],
  },
]
