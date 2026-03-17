import { UpdatePasswordForm } from '@/features/auth/components'

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 border-2 border-black bg-[#FFE500] p-6 shadow-[6px_6px_0px_0px_#000]">
          <h1 className="text-3xl font-black uppercase tracking-tight">Nueva Contraseña</h1>
          <p className="mt-1 font-bold text-black/70">Elige una contraseña segura.</p>
        </div>

        {/* Form card */}
        <div className="border-2 border-black bg-white p-6 shadow-[6px_6px_0px_0px_#000]">
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  )
}
