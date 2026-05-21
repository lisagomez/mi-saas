import type { Config } from 'tailwindcss'
import { TI_COLORS, TI_SHADOWS, TI_GRADIENTS } from './src/shared/design-system/titaniumorphism'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ti: {
          base:      TI_COLORS.bg.base,
          surface:   TI_COLORS.bg.surface,
          elevated:  TI_COLORS.bg.elevated,
          inset:     TI_COLORS.bg.inset,
          'border-dim':  TI_COLORS.border.dim,
          'border-glow': TI_COLORS.border.glow,
          'text-primary':   TI_COLORS.text.primary,
          'text-secondary': TI_COLORS.text.secondary,
          'text-muted':     TI_COLORS.text.muted,
          cyan:   TI_COLORS.accent.cyan,
          green:  TI_COLORS.accent.green,
          orange: TI_COLORS.accent.orange,
          violet: TI_COLORS.accent.violet,
          blue:   TI_COLORS.accent.blue,
        },
      },
      boxShadow: {
        'ti-card':     TI_SHADOWS.card,
        'ti-elevated': TI_SHADOWS.elevated,
        'ti-inset':    TI_SHADOWS.inset,
        'ti-active':   TI_SHADOWS.active,
      },
      backgroundImage: {
        'ti-surface':     TI_GRADIENTS.surface,
        'ti-elevated':    TI_GRADIENTS.elevated,
        'ti-tab-active':  TI_GRADIENTS.tabActive,
        'ti-btn-primary': TI_GRADIENTS.btnPrimary,
        'ti-btn-ghost':   TI_GRADIENTS.btnGhost,
      },
    },
  },
  plugins: [],
}

export default config
