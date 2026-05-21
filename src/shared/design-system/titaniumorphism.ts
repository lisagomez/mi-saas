// Titaniumorphism Design System — tokens TypeScript
// Superficies metálicas de titanio oscuro con gradientes iridiscentes y luz rasante.
// REGLA: usar solo clases Tailwind completas (no template literals) para evitar purge issues.

export const TI_COLORS = {
  bg: {
    base:     '#1C1E24', // cuerpo del dashboard (titanio carbono)
    surface:  '#23262F', // cards / paneles (capa 1)
    elevated: '#2C303C', // modals, popovers (capa 2)
    inset:    '#171920', // inputs, áreas hundidas (capa 0)
  },
  border: {
    dim:  '#3A3F4E', // borde base
    glow: '#5A6278', // borde activo / hover
  },
  text: {
    primary:   '#F0F2F7', // textos principales
    secondary: '#8C93A8', // subtítulos, etiquetas
    muted:     '#555B6E', // placeholders, deshabilitados
  },
  accent: {
    cyan:   '#22D3EE', // ingresos
    green:  '#4ADE80', // ROI
    orange: '#FB923C', // CAC
    violet: '#A78BFA', // LTV
    blue:   '#4A7FBD', // default / titanio azul
  },
} as const

export const TI_SHADOWS = {
  card:     '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
  elevated: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
  inset:    'inset 0 2px 8px rgba(0,0,0,0.5)',
  active:   '0 0 0 2px #4A7FBD, 0 4px 16px rgba(74,127,189,0.3)',
} as const

// Gradientes como backgroundImage strings para registrar en tailwind.config.ts
export const TI_GRADIENTS = {
  surface:    'linear-gradient(135deg, #2A2D36 0%, #1F2229 60%, #262A34 100%)',
  elevated:   'linear-gradient(135deg, #32374A 0%, #252933 100%)',
  tabActive:  'linear-gradient(135deg, #4A7FBD 0%, #3D6BA3 100%)',
  btnPrimary: 'linear-gradient(135deg, #4A7FBD 0%, #3260A0 100%)',
  btnGhost:   'linear-gradient(135deg, rgba(74,127,189,0.1) 0%, rgba(50,96,160,0.05) 100%)',
} as const

export type TiAccent = keyof typeof TI_COLORS['accent']
export type TiVariant = 'surface' | 'elevated' | 'inset'
export type TiButtonVariant = 'primary' | 'secondary' | 'ghost'

// Mapa de acento a clases completas de Tailwind (no template literals)
export const TI_ACCENT_BORDER_CLASS: Record<TiAccent, string> = {
  cyan:   'border-l-[3px] border-l-[#22D3EE]',
  green:  'border-l-[3px] border-l-[#4ADE80]',
  orange: 'border-l-[3px] border-l-[#FB923C]',
  violet: 'border-l-[3px] border-l-[#A78BFA]',
  blue:   'border-l-[3px] border-l-[#4A7FBD]',
}

export const TI_ACCENT_TEXT_CLASS: Record<TiAccent, string> = {
  cyan:   'text-[#22D3EE]',
  green:  'text-[#4ADE80]',
  orange: 'text-[#FB923C]',
  violet: 'text-[#A78BFA]',
  blue:   'text-[#4A7FBD]',
}
