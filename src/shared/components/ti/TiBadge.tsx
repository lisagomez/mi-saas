interface TiBadgeProps {
  count: number
  variant?: 'blue' | 'amber' | 'violet' | 'cyan'
}

const VARIANT_CLASSES: Record<NonNullable<TiBadgeProps['variant']>, string> = {
  blue:   'bg-[#4A7FBD]/20 text-[#4A7FBD]',
  amber:  'bg-[#FB923C]/20 text-[#FB923C]',
  violet: 'bg-[#A78BFA]/20 text-[#A78BFA]',
  cyan:   'bg-[#22D3EE]/20 text-[#22D3EE]',
}

export function TiBadge({ count, variant = 'blue' }: TiBadgeProps) {
  if (count <= 0) return null
  return (
    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${VARIANT_CLASSES[variant]}`}>
      {count}
    </span>
  )
}
