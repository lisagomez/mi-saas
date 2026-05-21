import type { TiButtonVariant } from '@/shared/design-system/titaniumorphism'

const VARIANT_CLASSES: Record<TiButtonVariant, string> = {
  primary:
    'text-white border border-[#5A6278] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]',
  secondary:
    'bg-[#23262F] text-[#F0F2F7] border border-[#3A3F4E] hover:border-[#5A6278] hover:bg-[#2C303C] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]',
  ghost:
    'bg-transparent text-[#8C93A8] border border-[#3A3F4E] hover:border-[#5A6278] hover:text-[#F0F2F7]',
}

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

interface TiButtonProps {
  variant?: TiButtonVariant
  size?: 'sm' | 'md'
  disabled?: boolean
  onClick?: () => void
  className?: string
  children: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
}

export function TiButton({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  children,
  type = 'button',
}: TiButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={
        variant === 'primary'
          ? { backgroundImage: 'linear-gradient(135deg, #4A7FBD 0%, #3260A0 100%)' }
          : undefined
      }
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-semibold
        transition-all duration-150 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${className}
      `}
    >
      {children}
    </button>
  )
}
