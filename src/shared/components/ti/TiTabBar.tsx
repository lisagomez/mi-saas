'use client'

interface Tab {
  key: string
  label: string
  badge?: number
  badgeVariant?: 'blue' | 'amber' | 'violet' | 'cyan'
}

interface TiTabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (key: string) => void
  className?: string
}

export function TiTabBar({ tabs, activeTab, onTabChange, className = '' }: TiTabBarProps) {
  return (
    <div
      className={`flex gap-1 rounded-xl border border-[#3A3F4E] p-1 overflow-x-auto ${className}`}
      style={{ background: 'linear-gradient(135deg, #1F2229 0%, #1C1E24 100%)' }}
    >
      {tabs.map((t) => {
        const isActive = t.key === activeTab
        return (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`
              flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap
              transition-all duration-150
              ${isActive
                ? 'text-white shadow-ti-active border border-[#5A6278]'
                : 'text-[#8C93A8] hover:text-[#F0F2F7] hover:bg-[#2C303C]'
              }
            `}
            style={isActive ? { backgroundImage: 'linear-gradient(135deg, #4A7FBD 0%, #3D6BA3 100%)' } : undefined}
          >
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  isActive ? 'bg-white/20 text-white' : BadgeVariantClasses[t.badgeVariant ?? 'blue']
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

const BadgeVariantClasses = {
  blue:   'bg-[#4A7FBD]/20 text-[#4A7FBD]',
  amber:  'bg-[#FB923C]/20 text-[#FB923C]',
  violet: 'bg-[#A78BFA]/20 text-[#A78BFA]',
  cyan:   'bg-[#22D3EE]/20 text-[#22D3EE]',
}
