'use client'

import { useState } from 'react'
import { logout } from '@/features/auth/services/logout'
import { AppLauncherPopover } from '@/features/app-launcher/components/AppLauncherPopover'

type Role = 'creativo' | 'agente_investigador' | 'admin_pagos' | 'administrador' | null

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
  const [loggingOut, setLoggingOut] = useState(false)
  const roleInfo = role ? ROLE_LABELS[role] : null

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Top header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
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

      {/* ── Page content ───────────────────────────────────────────── */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
