'use client'

import { useState } from 'react'
import { signup } from '@/actions/auth'
import { GoogleSignInButton } from './GoogleSignInButton'
import { AuthDivider } from './AuthDivider'

export function SignupForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <GoogleSignInButton label="Registrarse con Google" />

      <AuthDivider />

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-black uppercase tracking-wider">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 block w-full border-2 border-black bg-white px-3 py-2.5 font-medium shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:shadow-[5px_5px_0px_0px_#FFE500]"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-black uppercase tracking-wider">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-1 block w-full border-2 border-black bg-white px-3 py-2.5 font-medium shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:shadow-[5px_5px_0px_0px_#FFE500]"
          />
          <p className="mt-1 text-xs font-medium text-black/60">Mínimo 6 caracteres</p>
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
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </button>
      </form>
    </div>
  )
}
