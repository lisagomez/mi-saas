import type { VideoStatus } from '@/types/database'

const STATUS_CONFIG: Record<VideoStatus, { label: string; className: string }> = {
  pendiente: { label: 'Sin video', className: 'bg-gray-100 text-gray-500' },
  recopilando_fotos: { label: '📸 Fotos', className: 'bg-blue-100 text-blue-700' },
  generando: { label: '⏳ Generando', className: 'bg-yellow-100 text-yellow-700' },
  listo: { label: '🎬 Listo', className: 'bg-green-100 text-green-700' },
  fallido: { label: '❌ Falló', className: 'bg-red-100 text-red-700' },
}

export function VideoStatusBadge({ status }: { status: VideoStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendiente
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
