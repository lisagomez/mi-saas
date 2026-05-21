import type { TiVariant, TiAccent } from '@/shared/design-system/titaniumorphism'
import { TI_ACCENT_BORDER_CLASS } from '@/shared/design-system/titaniumorphism'

const VARIANT_CLASSES: Record<TiVariant, string> = {
  surface:  'bg-ti-surface shadow-ti-card',
  elevated: 'bg-ti-elevated shadow-ti-elevated',
  inset:    'bg-ti-inset shadow-ti-inset',
}

interface TiCardProps {
  variant?: TiVariant
  accent?: TiAccent
  className?: string
  children: React.ReactNode
}

export function TiCard({ variant = 'surface', accent, className = '', children }: TiCardProps) {
  const variantClass = VARIANT_CLASSES[variant]
  const accentClass = accent ? TI_ACCENT_BORDER_CLASS[accent] : ''

  return (
    <div
      className={`rounded-xl border border-[#3A3F4E] ${variantClass} ${accentClass} ${className}`}
      style={{ backgroundImage: variant === 'surface' ? 'linear-gradient(135deg, #2A2D36 0%, #1F2229 60%, #262A34 100%)' : variant === 'elevated' ? 'linear-gradient(135deg, #32374A 0%, #252933 100%)' : undefined }}
    >
      {children}
    </div>
  )
}
