# PRP-012: Titaniumorphism Design System — CancioBot Dashboard

> **Estado**: COMPLETADO ✓ (verificado 2026-06-13)
> **Fecha**: 2026-05-21
> **Proyecto**: CancioBot / mi-saas

---

## Objetivo

Crear el sistema de diseño **Titaniumorphism** — superficies metálicas de titanio oscuro con gradientes iridiscentes, reflejos de luz rasante y tipografía de alta precisión — e implementarlo como la capa visual del dashboard de CancioBot, reemplazando los estilos actuales `bg-white / border-gray-200` por componentes primitivos reutilizables que eleven la percepción de marca sin romper ninguna funcionalidad existente.

---

## Por Qué

| Problema | Solución |
|----------|----------|
| El dashboard actual usa estilos utilitarios genéricos (cards blancas, bordes grises) que no reflejan la identidad premium de CancioBot ni diferencian la marca | Titaniumorphism aplica superficies metálicas con gradientes iridiscentes y sombras de profundidad que comunican precisión y exclusividad |
| Los 4 roles del dashboard (creativo, investigador, financiero, admin) comparten la misma paleta visual sin jerarquía ni identidad de rol | El sistema define tokens de color por rol (acento titanio-azul para creativo, titanio-verde para financiero, etc.) que se encapsulan en primitivos reutilizables |
| Agregar un nuevo componente requiere repetir clases de Tailwind en cada archivo — sin un sistema de tokens visual el código es inconsistente y difícil de mantener | El sistema expone primitivos tipados (`TiCard`, `TiButton`, `TiMetricCard`, `TiTabBar`) que encapsulan toda la lógica visual y garantizan consistencia |

**Valor de negocio**: Una identidad visual premium aumenta la credibilidad del producto ante el equipo operativo que usa el dashboard diariamente. Los primitivos reutilizables reducen tiempo de desarrollo de futuras features de dashboard en ~60% al eliminar decisiones de diseño repetitivas. El sistema es extensible al resto de la app sin refactor estructural.

---

## Qué

### Criterios de Éxito

- [ ] El archivo `src/shared/design-system/titaniumorphism.ts` define todos los tokens de color, gradientes, sombras y tipografía del sistema con valores TypeScript exportables
- [ ] Los primitivos `TiCard`, `TiButton`, `TiMetricCard`, `TiTabBar`, `TiBadge` existen en `src/shared/components/ti/` y pasan TypeScript sin `any`
- [ ] `AdminView`, `FinancieroView`, `CreativoView` e `InvestigadorView` usan los primitivos Titaniumorphism en lugar de clases ad-hoc
- [ ] La barra de tabs de `AdminView` usa `TiTabBar` con el estado activo en estilo titanio-iridiscente
- [ ] Las `MetricCard` de `FinancieroView` usan `TiMetricCard` con gradiente metálico y tipografía de alta precisión
- [ ] Los `AvatarCard` y pipeline de la pestaña Avatar usan `TiCard` como contenedor
- [ ] `npm run typecheck` y `npm run build` pasan sin errores
- [ ] Playwright screenshot confirma que el dashboard muestra la nueva identidad visual en al menos 2 vistas

### Comportamiento Esperado (Happy Path)

```
Administrador navega a /dashboard
    ↓
Ve el dashboard con fondo titanio oscuro (#1C1E24) y superficies de card
con gradiente iridiscente sutil (de #2A2D35 a #232630 con brillo en el
borde superior derecho tipo luz rasante)
    ↓
La barra de tabs muestra el tab activo con relleno de gradiente
titanio-azul (#4A7FBD → #3D6BA3) + texto blanco brillante
Los tabs inactivos son superficie oscura sin relleno + texto titanio-gris
    ↓
En la pestaña Financiero, las MetricCards muestran:
  - Fondo: gradiente metálico sutil
  - Número principal: tipografía condensada blanca peso 700
  - Etiqueta: uppercase titanio-gris-claro tracking-widest
  - Borde izquierdo de acento por tipo de métrica (azul ROI, verde ingresos, etc.)
    ↓
Los botones de acción (Confirmar pago, Generar reporte) usan TiButton
variante "primary" con gradiente metálico + efecto presionado (inset shadow
en active)
```

---

## Contexto

### Referencias de Código Existente

- `src/features/dashboard/components/admin-view.tsx` — componente principal a migrar; contiene tabs, lógica de roles, todas las sub-vistas
- `src/features/dashboard/components/financiero-view.tsx` — `MetricCard` inline a reemplazar por `TiMetricCard`; tiene `FinancieroView` con estructura clara
- `src/features/dashboard/components/creativo-view.tsx` — vista del rol creativo con lista de órdenes a estilizar
- `src/features/dashboard/components/investigador-view.tsx` — tabla editable de competidores a envolver en `TiCard`
- `.claude/design-systems/neumorphism/neumorphism.md` — referencia técnica del patrón de sombras duales; Titaniumorphism toma la misma técnica pero la adapta a superficies oscuras metálicas
- `tailwind.config.ts` — actualmente vacío en `extend`; aquí se registran los tokens custom del sistema

### Paleta del Sistema Titaniumorphism

```
Fondos:
  --ti-bg-base:      #1C1E24   ← cuerpo del dashboard (titanio carbono)
  --ti-bg-surface:   #23262F   ← cards / paneles (capa 1)
  --ti-bg-elevated:  #2C303C   ← modals, popovers (capa 2)
  --ti-bg-inset:     #171920   ← inputs, áreas hundidas (capa 0)

Bordes metálicos:
  --ti-border-dim:   #3A3F4E   ← borde base
  --ti-border-glow:  #5A6278   ← borde activo / hover

Gradientes de superficie (iridiscentes):
  surface: linear-gradient(135deg, #2A2D36 0%, #1F2229 60%, #262A34 100%)
  elevated: linear-gradient(135deg, #32374A 0%, #252933 100%)
  active-tab: linear-gradient(135deg, #4A7FBD 0%, #3D6BA3 100%)
  btn-primary: linear-gradient(135deg, #4A7FBD 0%, #3260A0 100%)

Luz rasante (reflejo en borde superior):
  box-shadow top: inset 0 1px 0 rgba(255,255,255,0.06)
  box-shadow outer glow: 0 4px 24px rgba(0,0,0,0.4)

Texto:
  --ti-text-primary:   #F0F2F7  ← textos principales
  --ti-text-secondary: #8C93A8  ← subtítulos, etiquetas
  --ti-text-muted:     #555B6E  ← placeholders, deshabilitados

Acentos por tipo de dato (borde izquierdo en MetricCard):
  ingresos:   #22D3EE  (cyan)
  roi:        #4ADE80  (verde)
  cac:        #FB923C  (naranja)
  ltv:        #A78BFA  (violeta)
  default:    #4A7FBD  (azul titanio)
```

### Arquitectura Propuesta (Feature-First)

```
src/shared/
├── design-system/
│   └── titaniumorphism.ts          ← tokens del sistema (colores, sombras, variantes)
│
└── components/
    └── ti/                         ← primitivos Titaniumorphism
        ├── index.ts                ← re-export de todos los primitivos
        ├── TiCard.tsx              ← contenedor de superficie metálica
        ├── TiButton.tsx            ← botón con gradiente + efecto presionado
        ├── TiMetricCard.tsx        ← tarjeta de KPI con acento izquierdo
        ├── TiTabBar.tsx            ← barra de tabs con estado activo iridiscente
        └── TiBadge.tsx             ← badge de notificación titanio

src/features/dashboard/components/
├── admin-view.tsx                  ← migrar tabs a TiTabBar, wrappers a TiCard
├── financiero-view.tsx             ← migrar MetricCard a TiMetricCard
├── creativo-view.tsx               ← wrappers a TiCard
└── investigador-view.tsx           ← table container a TiCard
```

### Modelo de Datos

No se requieren cambios de base de datos. Este PRP es puramente de capa de presentación.

Los tokens del sistema se definen en TypeScript y se registran en `tailwind.config.ts` bajo `theme.extend` para poder usarse como clases utilitarias además de los valores arbitrarios.

```typescript
// src/shared/design-system/titaniumorphism.ts (esquema)

export const TI_COLORS = {
  bg: { base: '#1C1E24', surface: '#23262F', elevated: '#2C303C', inset: '#171920' },
  border: { dim: '#3A3F4E', glow: '#5A6278' },
  text: { primary: '#F0F2F7', secondary: '#8C93A8', muted: '#555B6E' },
  accent: { cyan: '#22D3EE', green: '#4ADE80', orange: '#FB923C', violet: '#A78BFA', blue: '#4A7FBD' },
} as const

export const TI_SHADOWS = {
  card: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
  elevated: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
  inset: 'inset 0 2px 8px rgba(0,0,0,0.5)',
  active: '0 0 0 2px #4A7FBD, 0 4px 16px rgba(74,127,189,0.3)',
} as const

export type TiAccent = 'cyan' | 'green' | 'orange' | 'violet' | 'blue'
export type TiVariant = 'surface' | 'elevated' | 'inset'
```

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo fases. Las subtareas se generan al entrar a cada fase con el bucle agéntico.

### Fase 1: Tokens y Sistema de Diseño

**Objetivo**: Crear `src/shared/design-system/titaniumorphism.ts` con todos los tokens (colores, gradientes, sombras, variantes). Extender `tailwind.config.ts` con los custom colors y boxShadow tokens del sistema `ti-*` para usarlos como clases utilitarias.
**Validación**: `npm run typecheck` pasa. Los tokens son importables desde cualquier componente con tipado correcto.

### Fase 2: Primitivos Base — TiCard y TiButton

**Objetivo**: Implementar `TiCard` (contenedor de superficie metálica con 3 variantes: surface, elevated, inset + slot para `accent` de borde) y `TiButton` (botón con gradiente primario/secundario/ghost + efecto active inset). Agregar `index.ts` que re-exporta todos los primitivos.
**Validación**: Los primitivos renderizan correctamente en aislamiento. TypeScript acepta todas las props. No hay warnings de hidratación SSR.

### Fase 3: Primitivos de Dashboard — TiMetricCard, TiTabBar, TiBadge

**Objetivo**: Implementar los primitivos específicos del dashboard: `TiMetricCard` (reemplaza `MetricCard` inline en `financiero-view.tsx`, acepta `accent: TiAccent`), `TiTabBar` (reemplaza la barra de tabs de `AdminView`, maneja estado activo iridiscente), y `TiBadge` (reemplaza los `span` de contadores en los tabs).
**Validación**: Los primitivos aceptan las mismas props que los componentes actuales que reemplazan. TypeScript pasa.

### Fase 4: Migración de FinancieroView e InvestigadorView

**Objetivo**: Reemplazar los estilos inline de `FinancieroView` (MetricCard, contenedores de gráfico y barra de presupuesto) con los primitivos `TiMetricCard` y `TiCard`. Envolver la tabla de competidores en `InvestigadorView` con `TiCard`. Aplicar tokens de texto titanio a las etiquetas.
**Validación**: Las dos vistas muestran la nueva identidad visual. Los datos siguen renderizando correctamente. `npm run typecheck` pasa.

### Fase 5: Migración de AdminView y CreativoView

**Objetivo**: Reemplazar la barra de tabs de `AdminView` con `TiTabBar` (incluye los badges de notificación con `TiBadge`). Envolver el contenido de cada panel del administrador en `TiCard`. Migrar `CreativoView` aplicando `TiCard` a las order cards.
**Validación**: El administrador puede navegar entre todos los tabs. Los badges de conteo siguen apareciendo correctamente. No hay regresión funcional.

### Fase 6: Validación Final

**Objetivo**: Sistema visual completo y coherente en todas las vistas del dashboard.
**Validación**:
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run build` exitoso
- [ ] Playwright screenshot del dashboard confirma identidad Titaniumorphism visible en las vistas Admin y Financiero
- [ ] La barra de tabs muestra el estado activo con gradiente iridiscente (no el estilo `bg-white shadow-sm` anterior)
- [ ] Las MetricCards muestran fondo metálico oscuro + borde de acento de color
- [ ] Ninguna funcionalidad rota: tabs navegan, badges cuentan, gráficos renderizan, acciones de pago funcionan

---

## Aprendizajes (Self-Annealing)

> Esta sección crece con cada error encontrado durante la implementación.

---

## Gotchas

- [ ] Tailwind purge: los tokens dinámicos generados con template literals (e.g., `bg-ti-${color}`) NO son detectados por Tailwind; usar clases completas en el objeto de tokens o safelist en `tailwind.config.ts`
- [ ] El `CashFlowChart` usa Recharts con `dynamic import ssr:false`; el fondo del chart debe configurarse via `props` de Recharts (no clases Tailwind en el wrapper) para que el fondo oscuro sea correcto
- [ ] `financiero-view.tsx` tiene `MetricCard` definida como función local en el mismo archivo; al extraerla a `TiMetricCard` hay que verificar que el bundle tree-shake la función local eliminada
- [ ] Los primitivos `TiCard` y `TiButton` necesitan `forwardRef` si se usan con librerías que esperan ref (Radix UI, etc.) — aunque en esta versión no es bloqueante
- [ ] El fondo oscuro del dashboard requiere cambiar el contenedor padre `div.mx-auto.max-w-5xl` en `page.tsx` para que no herede el `bg-white` del layout general; verificar el DashboardShell antes de aplicar fondo base

## Anti-Patrones

- NO definir clases Tailwind de colores como strings parciales (e.g. `'bg-' + color`) — siempre usar las clases completas hardcoded o arbitrarias (`bg-[#1C1E24]`)
- NO crear un archivo CSS global para el sistema — usar únicamente tokens TypeScript + clases Tailwind para mantener tree-shaking
- NO copiar clases de titaniumorphism directamente en los componentes de vista; SIEMPRE usar los primitivos `Ti*` como capa de abstracción
- NO cambiar la lógica de datos, fetches, Server Actions ni RLS — este PRP es 100% presentacional
- NO ignorar errores de TypeScript con `any` al refactorizar las props de los componentes migrados

---

*PRP pendiente aprobación. No se ha modificado código.*
