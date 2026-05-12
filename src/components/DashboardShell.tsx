'use client'

import { useState } from 'react'
import { logout } from '@/features/auth/services/logout'
import { AppLauncherPopover } from '@/features/app-launcher/components/AppLauncherPopover'

type Role = 'creativo' | 'agente_investigador' | 'admin_pagos' | 'administrador' | null

interface NavItem {
  icon: string
  label: string
  href: string
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  creativo: [
    { icon: '🎵', label: 'Letras', href: '/dashboard' },
  ],
  agente_investigador: [
    { icon: '🔍', label: 'Competencia', href: '/dashboard' },
  ],
  admin_pagos: [
    { icon: '💳', label: 'Pagos', href: '/dashboard' },
    { icon: '📊', label: 'Financiero', href: '/dashboard' },
  ],
  administrador: [
    { icon: '🎵', label: 'Letras', href: '/dashboard' },
    { icon: '🔍', label: 'Competencia', href: '/dashboard' },
    { icon: '📊', label: 'Financiero', href: '/dashboard' },
    { icon: '💳', label: 'Pagos', href: '/dashboard' },
    { icon: '🎬', label: 'Videos', href: '/dashboard' },
    { icon: '📣', label: 'Facebook Ads', href: '/dashboard' },
    { icon: '💾', label: 'Storage', href: '/dashboard' },
    { icon: '🤖', label: 'Agentes', href: '/dashboard' },
  ],
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  creativo:            { label: 'Creativo',      color: 'bg-indigo-100 text-indigo-700' },
  agente_investigador: { label: 'Investigador',  color: 'bg-emerald-100 text-emerald-700' },
  admin_pagos:         { label: 'Admin Pagos',   color: 'bg-amber-100 text-amber-700' },
  administrador:       { label: 'Administrador', color: 'bg-rose-100 text-rose-700' },
}

interface Props {
  email: string
  role: Role
  children: React.ReactNode
}

export function DashboardShell({ email, role, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const navItems = role ? (NAV_BY_ROLE[role] ?? []) : []
  const roleInfo = role ? ROLE_LABELS[role] : null

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Sidebar overlay (mobile) ────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`fixed top-0 left-0 z-30 h-full w-60 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>

        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
          <span className="text-2xl">🎸</span>
          <span className="font-bold text-gray-900 text-lg tracking-tight">CancioBot</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.length > 1 && (
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Secciones
            </p>
          )}
          {navItems.map(item => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-gray-100 p-4 space-y-3">
          {roleInfo && (
            <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-1 ${roleInfo.color}`}>
              {roleInfo.label}
            </span>
          )}
          <p className="text-xs text-gray-400 truncate">{email}</p>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full text-left text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {loggingOut ? 'Cerrando...' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Hamburger (mobile) */}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Abrir menú"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo (mobile, hidden on desktop since sidebar has it) */}
            <span className="lg:hidden font-bold text-gray-900 flex items-center gap-1.5">
              <span>🎸</span> CancioBot
            </span>
          </div>

          {/* App launcher */}
          <AppLauncherPopover />

          {/* Right: role + email + logout */}
          <div className="flex items-center gap-3">
            {roleInfo && (
              <span className={`hidden sm:inline-block text-xs font-semibold rounded-full px-2.5 py-1 ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
            )}
            <span className="hidden md:block text-sm text-gray-400 truncate max-w-[180px]">{email}</span>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-red-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">{loggingOut ? 'Saliendo...' : 'Salir'}</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
