'use client'

export default function Error({
  error,
}: {
  error: Error & { digest?: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-lg w-full bg-white rounded-xl border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-700 mb-2">Error del servidor</h2>
        <p className="text-sm text-gray-600 font-mono bg-red-50 rounded-lg p-3 break-all">
          {error.message || 'Error desconocido'}
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mt-2">digest: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
