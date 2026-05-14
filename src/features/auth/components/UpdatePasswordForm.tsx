'use client'

import { useState } from 'react'
import { updatePassword } from '@/actions/auth'

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7c1.02 0 2 .16 2.91.46M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
    </svg>
  )
}

export function UpdatePasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleSubmit(formData: FormData) {
    const password = formData.get('password') as string
    const confirm = formData.get('confirm') as string

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    setError(null)
    const result = await updatePassword(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-xs font-black uppercase tracking-wider">
          Nueva Contraseña
        </label>
        <div className="relative mt-1">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={6}
            className="block w-full border-2 border-black bg-white px-3 py-2.5 pr-10 font-medium shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:shadow-[5px_5px_0px_0px_#FFE500]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-black/50 hover:text-black"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="confirm" className="block text-xs font-black uppercase tracking-wider">
          Confirmar Contraseña
        </label>
        <div className="relative mt-1">
          <input
            id="confirm"
            name="confirm"
            type={showConfirm ? 'text' : 'password'}
            required
            minLength={6}
            className="block w-full border-2 border-black bg-white px-3 py-2.5 pr-10 font-medium shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:shadow-[5px_5px_0px_0px_#FFE500]"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-black/50 hover:text-black"
            aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}
          >
            {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      {error && (
        <div className="border-2 border-black bg-red-400 px-3 py-2 font-bold shadow-[3px_3px_0px_0px_#000]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full border-2 border-black bg-[#FFE500] px-4 py-3 font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#000] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#000] disabled:opacity-50"
      >
        {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
      </button>
    </form>
  )
}
