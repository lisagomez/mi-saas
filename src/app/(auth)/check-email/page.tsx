import Link from 'next/link'

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="border-2 border-black bg-[#FFE500] p-8 text-center shadow-[6px_6px_0px_0px_#000]">
          <div className="text-6xl">📬</div>
          <h1 className="mt-4 text-3xl font-black uppercase">Revisa tu Email</h1>
          <p className="mt-2 font-medium text-black/70">
            Te enviamos un link de confirmación. Revisa tu bandeja de entrada (y el spam).
          </p>
        </div>
        <div className="text-center">
          <Link
            href="/login"
            className="inline-block border-2 border-black bg-white px-6 py-2.5 font-black uppercase shadow-[4px_4px_0px_0px_#000] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000]"
          >
            Volver al Login
          </Link>
        </div>
      </div>
    </div>
  )
}
