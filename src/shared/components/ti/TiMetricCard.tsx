import type { TiAccent } from '@/shared/design-system/titaniumorphism'
import { TI_ACCENT_BORDER_CLASS, TI_ACCENT_TEXT_CLASS } from '@/shared/design-system/titaniumorphism'

interface TiMetricCardProps {
  label: string
  value: string
  sub?: string
  accent?: TiAccent
}

export function TiMetricCard({ label, value, sub, accent = 'blue' }: TiMetricCardProps) {
  return (
    <div
      className={`rounded-xl border border-[#3A3F4E] p-5 ${TI_ACCENT_BORDER_CLASS[accent]} shadow-ti-card`}
      style={{ backgroundImage: 'linear-gradient(135deg, #2A2D36 0%, #1F2229 60%, #262A34 100%)' }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8C93A8]">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tracking-tight ${TI_ACCENT_TEXT_CLASS[accent]}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-[#555B6E]">{sub}</p>}
    </div>
  )
}
