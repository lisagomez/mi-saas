import Link from 'next/link'
import { SignupForm } from '@/features/auth/components'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 border-2 border-black bg-[#FFE500] p-6 shadow-[6px_6px_0px_0px_#000]">
          <h1 className="text-4xl font-black uppercase tracking-tight">CancioBot 🎵</h1>
          <p className="mt-1 font-bold text-black/70">Crea tu cuenta y únete al equipo.</p>
        </div>

        {/* Form card */}
        <div className="border-2 border-black bg-white p-6 shadow-[6px_6px_0px_0px_#000]">
          <SignupForm />
        </div>

        <p className="mt-4 text-center text-sm font-bold">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="underline decoration-2 hover:text-black/60">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
