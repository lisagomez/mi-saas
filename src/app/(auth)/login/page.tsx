import { Suspense } from 'react'
import Link from 'next/link'
import { LoginForm } from '@/features/auth/components'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 border-2 border-black bg-[#FFE500] p-6 shadow-[6px_6px_0px_0px_#000]">
          <h1 className="text-4xl font-black uppercase tracking-tight">CancioBot 🎵</h1>
          <p className="mt-1 font-bold text-black/70">Entra a tu cuenta, primo.</p>
        </div>

        {/* Form card */}
        <div className="border-2 border-black bg-white p-6 shadow-[6px_6px_0px_0px_#000]">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-4 text-center text-sm font-bold">
          ¿No tienes cuenta?{' '}
          <Link href="/signup" className="underline decoration-2 hover:text-black/60">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
