# PRP-011: App Launcher (Microsoft 365 Style)

> **Estado**: COMPLETADO ✓ (verificado 2026-06-13)
> **Fecha**: 2026-05-12
> **Proyecto**: CancioBot / mi-saas

---

## Objetivo

Agregar un botón de App Launcher en el header del `DashboardShell` que, al hacer clic, abre un Popover con un grid de apps agrupadas por temas, permitiendo navegar tanto a rutas internas del dashboard como a URLs externas, replicando la experiencia del launcher de Microsoft 365.

## Por Qué

| Problema | Solución |
|----------|----------|
| El sidebar solo muestra las secciones del rol actual, sin visión de otras herramientas o recursos externos | El launcher expone todas las apps/herramientas del ecosistema agrupadas por categoría, independientemente del rol |
| El administrador tiene 11 tabs en el panel y navegarlas requiere scroll horizontal en mobile | El launcher ofrece acceso directo a cualquier sección/herramienta con un click desde cualquier pantalla |
| No hay un punto central de acceso rápido a herramientas externas (Supabase, Vercel, WhatsApp Business, etc.) | El launcher puede incluir links externos relevantes junto con las rutas internas |

**Valor de negocio**: Reduce fricción de navegación para el administrador que opera múltiples herramientas. Patrón familiar (M365/Google Apps) que no requiere aprendizaje. Escalable — agregar una nueva herramienta es solo agregar un ítem al JSON de configuración.

## Qué

### Criterios de Éxito
- [ ] El botón de launcher aparece en el header del `DashboardShell` (todos los roles)
- [ ] Al hacer clic abre un Popover con grid de apps agrupadas por categoría
- [ ] Las apps con `href` interno navegan con `next/link` (sin recarga)
- [ ] Las apps con URL externa abren en nueva pestaña
- [ ] El Popover cierra al hacer clic fuera o al seleccionar una app
- [ ] El componente es 100% configurable desde un archivo JSON/TS de definición
- [ ] Responsive: en mobile el popover ocupa ancho completo o se adapta
- [ ] `npm run typecheck` y `npm run build` pasan sin errores

### Comportamiento Esperado (Happy Path)

```
Usuario en /dashboard (cualquier rol)
    ↓
Hace clic en ícono de "waffle" (⊞) en el header
    ↓
Se abre Popover debajo del ícono con:
    ├── Grupo: "Dashboard"
    │       [🎵 Letras] [🔍 Competencia] [📊 Financiero] [💳 Pagos]
    │       [🎬 Videos] [👥 Leads] [💰 Precios] [📣 Ads] [💾 Storage]
    ├── Grupo: "Catálogos"
    │       [📋 Catálogos]
    └── Grupo: "Herramientas"
            [🗄️ Supabase] [🚀 Vercel] [📱 WhatsApp Business]
    ↓
Usuario hace clic en "Letras"
    → Cierra popover, navega a /dashboard (o sección via tab state)
Usuario hace clic en "Supabase"
    → Cierra popover, abre https://supabase.com en nueva pestaña
```

---

## Contexto

### Referencias
- `src/components/DashboardShell.tsx` — Componente a modificar (header + nav). Actualmente 175 líneas, sin Radix.
- `src/features/dashboard/components/admin-view.tsx` — Patrón de tabs/navegación existente para sacar los grupos
- `components.json` — Shadcn configurado con style `new-york`, alias `@/components/ui`, iconos `lucide`
- `package.json` — Shadcn configurado pero `@radix-ui/*` no está instalado aún → instalar en Fase 1

### Arquitectura Propuesta (Feature-First)

```
src/features/app-launcher/
├── components/
│   └── AppLauncherPopover.tsx   # Componente Popover completo (client)
├── config/
│   └── apps.ts                  # Definición JSON de grupos y apps
└── types/
    └── index.ts                 # AppItem, AppGroup types
```

**Integración**: `AppLauncherPopover` se importa en `DashboardShell.tsx` y se coloca en el header, entre el hamburger (mobile) y el logo.

### Estructura de Configuración (apps.ts)

```typescript
// Cada app puede ser interna (href: '/ruta') o externa (href: 'https://...')
export interface AppItem {
  key: string
  label: string
  icon: string          // emoji o nombre de ícono Lucide
  href: string
  external?: boolean    // si true → target="_blank"
}

export interface AppGroup {
  label: string
  apps: AppItem[]
}

export const APP_GROUPS: AppGroup[] = [
  {
    label: 'Dashboard',
    apps: [
      { key: 'letras',      label: 'Letras',      icon: '🎵', href: '/dashboard?tab=letras' },
      { key: 'competencia', label: 'Competencia', icon: '🔍', href: '/dashboard?tab=competencia' },
      // ...
    ]
  },
  {
    label: 'Herramientas',
    apps: [
      { key: 'supabase', label: 'Supabase', icon: '🗄️', href: 'https://supabase.com/dashboard', external: true },
      // ...
    ]
  }
]
```

### Modelo de Datos
No requiere cambios en base de datos. Es un componente 100% frontend.

### Decisión: Shadcn Popover vs. implementación manual
Usar **Shadcn Popover** (que envuelve `@radix-ui/react-popover`) porque:
1. `components.json` ya está configurado para Shadcn — `npx shadcn add popover` instala limpio
2. Accesibilidad (aria, focus trap, keyboard navigation) sin código extra
3. Consistencia con el design system si se agregan más componentes Shadcn en el futuro

### Gotcha: Tab navigation del AdminView
El `AdminView` actualmente maneja el tab activo con `useState` interno. El launcher puede navegar usando query params `?tab=letras` y el `AdminView` debe leer `useSearchParams()` como valor inicial. Esto es una mejora secundaria — si el scope lo permite, se implementa en Fase 2; si no, los links del launcher simplemente van a `/dashboard` (sin tab pre-seleccionado).

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar)

### Fase 1: Instalar Shadcn Popover + Setup
**Objetivo**: Tener `@radix-ui/react-popover` + el componente `Popover` de Shadcn disponibles en `@/components/ui/popover` y que el build compile.
**Validación**: `npm run typecheck` pasa. `src/components/ui/popover.tsx` existe y exporta `Popover`, `PopoverTrigger`, `PopoverContent`.

### Fase 2: Tipos y Configuración de Apps
**Objetivo**: Crear `src/features/app-launcher/types/index.ts` con los tipos `AppItem`/`AppGroup`, y `src/features/app-launcher/config/apps.ts` con los grupos iniciales (Dashboard + Catálogos + Herramientas).
**Validación**: TypeScript no reporta errores en los nuevos archivos.

### Fase 3: Componente AppLauncherPopover
**Objetivo**: Crear `src/features/app-launcher/components/AppLauncherPopover.tsx` como Client Component que renderiza el botón waffle y el Popover con el grid de grupos y apps.
**Validación**: Componente tipado sin `any`, usa `next/link` para internas y `<a target="_blank">` para externas. Cierra al seleccionar.

### Fase 4: Integrar en DashboardShell
**Objetivo**: Importar `AppLauncherPopover` en `DashboardShell.tsx` y colocarlo en el header, a la izquierda del área de usuario. Visible para todos los roles.
**Validación**: El header muestra el botón waffle. El layout no rompe en mobile ni desktop.

### Fase 5: Deep-link por query param (tab navigation)
**Objetivo**: Hacer que el `AdminView` lea `?tab=X` de los search params para pre-seleccionar el tab inicial. Los links del launcher usan `?tab=letras`, `?tab=pagos`, etc.
**Validación**: Navegar a `/dashboard?tab=pagos` abre directamente la vista de Pagos en el panel admin.

### Fase 6: Validación Final
**Objetivo**: Sistema funcionando end-to-end, build limpio, UI verificada visualmente.
**Validación**:
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run build` exitoso (NODE_ENV=production)
- [ ] El launcher abre correctamente en desktop y mobile
- [ ] Links internos navegan sin recarga
- [ ] Links externos abren nueva pestaña
- [ ] Criterios de éxito de la sección "Qué" todos marcados

---

## Aprendizajes (Self-Annealing / Neural Network)

> Esta sección CRECE con cada error encontrado durante la implementación.

*(vacío — se llenará durante la implementación)*

---

## Gotchas

> Cosas críticas a tener en cuenta ANTES de implementar

- [ ] `@radix-ui/react-popover` NO está en `package.json` — instalar con `npx shadcn@latest add popover` (no solo npm install, para que también genere el archivo en `src/components/ui/`)
- [ ] `useSearchParams()` en Next.js App Router requiere Suspense boundary — si se usa para leer `?tab=`, envolver el consumer en `<Suspense>`
- [ ] `DashboardShell` es Client Component (`'use client'`) — el `AppLauncherPopover` también debe ser `'use client'`
- [ ] Tailwind no purga clases generadas dinámicamente — las clases del Popover deben ser strings completos, no construidos con template literals parciales
- [ ] `NODE_ENV=production npm run build` para el build final (ver aprendizaje 2026-04-02 en CLAUDE.md)

## Anti-Patrones

- NO hardcodear la lista de apps dentro del componente — siempre leer de `apps.ts`
- NO usar `any` — tipar con `AppItem` y `AppGroup`
- NO mezclar navegación interna con `<a href>` — usar `next/link` para rutas internas
- NO omitir `rel="noopener noreferrer"` en links externos
- NO agregar lógica de negocio en el componente (solo navegación y render)

---

*PRP pendiente aprobación. No se ha modificado código.*
