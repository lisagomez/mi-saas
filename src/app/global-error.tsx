'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#fafafa' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: '#fff',
            border: '1px solid #fca5a5',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h2 style={{ color: '#b91c1c', marginTop: 0 }}>Algo salió mal</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', fontFamily: 'monospace', background: '#fef2f2', borderRadius: '8px', padding: '12px', wordBreak: 'break-all' }}>
              {error.message || 'Error desconocido'}
            </p>
            {error.digest && (
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>
                digest: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{ marginTop: '16px', padding: '8px 16px', background: '#1f2937', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
