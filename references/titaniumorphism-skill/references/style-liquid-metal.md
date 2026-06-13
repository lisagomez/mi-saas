# Estilo Liquid Metal Premium — Spec Completo

> Variante de imagen para decks/manifestos/pillar content de SaaS Factory.
> Default es sketchnote (ver SKILL.md). Esta variante se invoca explicitamente.

## Cuando usar este estilo

| Usar | NO usar |
|------|---------|
| Manifestos / pillar content / posicionamiento | Tutoriales paso-a-paso |
| Decks profesionales (presentation HTML) | Build in public casual |
| Slides de conceptos centrales (tesis) | Lecciones / cursos cortos |
| Comparativas premium (versus, before/after) | Carouseles de comunidad |
| Brand-forward content (Daniel Carreon) | Reaction videos casuales |

## Triggers explicitos (Daniel)

- "estilo liquid metal", "estilo titanio", "estilo premium"
- "deck profesional", "manifesto", "presentacion premium"
- "estilo iPhone titanium", "estilo apple keynote"
- "estilo SaaS Factory deck"

Si Daniel NO especifica estilo, default es sketchnote.

## Spec visual

### Paleta de colores (NO negociable)

| Rol | Hex | Uso |
|-----|-----|-----|
| **Fondo principal** | `#09090b` | Fondo dark de toda la imagen |
| **Surface 1** | `#0d0d10` | Cards, areas elevadas |
| **Card** | `#1a1a1e` | Cards interior con frosted glass |
| **Purple primary** | `#683ACC` | Color marca SaaS Factory, accent izquierdo |
| **Purple accent** | `#8B5CF6` | Lineart, glow, highlights |
| **Purple soft** | `#A78BFA` | Texto secundario purple |
| **Gold (NUEVO standard)** | `#ff9101` | Accent derecho, color de oferta/precio |
| **Gold-orange dark** | `#B85B0B` | Bordes oscuros del gold |
| **Texto principal** | `#f7f8f8` | Inter Bold blanco |
| **Texto secundario** | `#d4d4d8` | Subtitulos |
| **Muted** | `#a1a1aa` | Captions y labels |
| **Border** | `#27272a` | Bordes sutiles cards |

### Caracteristicas del estilo

| Regla | Valor |
|-------|-------|
| **Fondo** | Dark `#09090b` con sutil brushed titanium texture horizontal (lineas tenues) |
| **Cards** | Glassmorphic con frosted blur intenso, esquinas suaves redondeadas (NO bevel duro tipo iPhone button) |
| **Bordes cards** | Liquid metal flowing organico (purple izquierda / naranja derecha) — efecto chrome fluyendo NO lineart fino |
| **Profundidad** | Multi-layer shadows debajo de cards, tilt 3D sutil opcional |
| **Iconos** | Lineart minimal silver chrome o outline purple/naranja delicado |
| **Logos** | Floating en mini-cards individuales con sutil glow, distribuidos alrededor |
| **Tipografia titulo** | Inter Bold blanco (8x size base), tracking -0.035em |
| **Tipografia body** | Inter Regular blanco/gris claro |
| **Tipografia tecnica** | JetBrains Mono para datos numericos |
| **Aspect ratio** | 16:9 siempre |

### Anti-patrones (PROHIBIDO)

- NO neon synthwave (V4 fail anterior)
- NO videojuego retro (V5 fail anterior)
- NO bevel duro tipo iPhone button (V1 R2 fail anterior)
- NO esquinas pronunciadas/duras
- NO crema/papel hand-drawn (eso es sketchnote)
- NO doodles ni caricaturas
- NO marker grueso
- NO fotorealismo
- NO logos automotrices ajenos (problema en V5 R1)

## Patron de prompting V4 (validado 30 Abr 2026 con R2-V3)

**Regla #1:** PROMPTS LARGOS aqui (4-8 lineas) — la sketchnote rule de "prompts cortos" NO aplica para liquid metal porque hay mas elementos visuales.

**Regla #2:** Mencionar SIEMPRE: dark `#09090b`, brushed titanium, liquid metal flowing en bordes, frosted glass interior, esquinas suaves.

**Regla #3:** Mencionar SIEMPRE NO-list al final: "NO neon, NO videojuego, NO crema, NO hand-drawn, NO bevel duro iPhone."

**Regla #4:** Color izquierda = purple `#683ACC`. Color derecha = naranja calido `#ff9101`. Esto es semantico: izquierda = harness/concepto principal. Derecha = modelo/concepto secundario.

**Regla #5:** Terminar SIEMPRE con: `"TODO el texto en ESPAÑOL. Formato 16:9."`

### Plantilla base de prompt

```
"Fondo dark #09090b con sutil brushed titanium texture horizontal.
Composicion 16:9 estilo liquid metal premium dimensional.
Dos cards glassmorphic enormes con efecto liquid metal flowing y dimensional,
esquinas suaves redondeadas, frosted glass interior, depth real con shadows debajo.
IZQUIERDA card con liquid metal purple #683ACC flowing organico en bordes,
contenido [ICONO/CONTENIDO IZQUIERDO], etiqueta dentro '[NOMBRE]' en Inter Bold blanco grande.
DERECHA card simetrica con liquid metal naranja calido #ff9101 flowing organico en bordes,
contenido [ICONO/CONTENIDO DERECHO], etiqueta dentro '[NOMBRE]' en Inter Bold blanco grande.
[Otros elementos: titulos, recuadros, flechas].
Estilo liquid metal premium hardware tipo iPhone titanium chassis, esquinas suaves.
NO neon synthwave, NO videojuego, NO crema, NO hand-drawn, NO bevel duro iPhone.
TODO el texto en ESPAÑOL. Formato 16:9."
```

### Ejemplos validados

**Ejemplo 1: Comparativa dual (R2-V3, Daniel top pick)**
```
"Fondo dark #09090b con sutil brushed titanium texture y soft purple glow.
Composicion 16:9 estilo liquid metal premium.
Dos cards glassmorphic enormes con efecto material liquido titanium,
reflejos curvos suaves brushed metal, bevel pronunciado en bordes con sombras layered profundas dimensional.
IZQUIERDA card con liquid metal purple #683ACC en bordes y reflejo suave,
contenido icono minimalista de chasis, etiqueta dentro 'HARNESS' en Inter Bold grande blanco.
DERECHA card simetrica con liquid metal naranja calido #ff9101, motor minimal,
etiqueta 'MODELO COMMODITY'.
Cards parecen flotar con sutil tilt 3D, reflejos metalicos en superficie superior tipo Tesla Cybertruck o iPhone 15 Pro titanium chassis.
Logos floating con micro-reflection alrededor.
Titulo arriba blanco bold: 'HARNESS vs MODELO'.
Texto inferior: 'EL COCHE ES TUYO. EL MOTOR LO ROTAS'.
Estilo premium hardware liquid metal, sensacion tactil de alta gama.
NO neon, NO videojuego, NO crema.
TODO el texto en ESPAÑOL. Formato 16:9."
```

**Ejemplo 2: Bucle conceptual**
```
"Fondo dark #09090b con sutil brushed titanium texture horizontal.
Composicion 16:9 estilo liquid metal premium dimensional.
Centro: gran simbolo infinito horizontal grande dibujado con liquid metal purple #683ACC flowing organico, multi-layered, dimensional.
Tres nodos posicionados en el bucle infinito etiquetados con cards glassmorphic pequenos:
'1. IA ESCRIBE CODIGO' con icono chip silver metal,
'2. HARNESS MEJORADO' con icono cohete silver metal,
'3. IA MAS CAPAZ' con icono grafica subiendo silver metal.
Las flechas del bucle son liquid metal flowing organico.
Recuadro grande abajo izquierda con liquid metal purple flowing en bordes y frosted glass interior,
contenido en Inter Bold blanco enorme: 'HYPERFRAMES: 414 COMMITS en 30 DIAS'.
Recuadro abajo derecha con liquid metal naranja calido #ff9101 flowing en bordes,
contenido: 'SOLO 3 MANTENEDORES APALANCADOS POR IA'.
Titulo arriba enorme blanco bold: 'EL HARNESS QUE SE MEJORA SOLO'.
Estilo liquid metal premium hardware tipo iPhone titanium chassis, esquinas suaves.
NO neon, NO videojuego, NO crema, NO hand-drawn.
TODO el texto en ESPAÑOL. Formato 16:9."
```

## Refs (--refs) recomendados

Para imagenes de comparativa harness vs modelo:
- Harnesses: `claudecode.png`, `cursor.png`, `opencode.png`, `hermes.jpg`, `openclaw.jpg`, `codex.svg`
- Modelos: `claude.png`, `deepseek.png`, `qwen.png`, `kimi.png`, `gemini.svg`

Pasar 4-8 logos como `--refs` para que Nano Banana 2 los integre coherentemente.

## Validacion post-generacion

Despues de generar, verificar:
1. **Tipografia**: TODO en español, sin palabras en ingles
2. **Colores**: purple izquierda + naranja `#ff9101` derecha (NO `#FFD700`)
3. **Esquinas**: suaves redondeadas, NO bevel duro
4. **Logos**: integrados, NO logos automotrices ajenos inventados
5. **Dimensional**: cards con depth real, no flat 2D

Si falla algo, regenerar con prompt mas explicito en ese aspecto.

## Compatibilidad con HTML deck

Las imagenes liquid metal combinan con el deck dark titanium SaaS Factory:
- Mismo fondo `#09090b`
- Misma paleta purple/gold (`#ff9101`)
- Mismo lenguaje glassmorphic

Esto garantiza continuidad visual entre slides texto y slides imagen del deck.

## Lessons learned (Round 1, 2, 3)

| Round | Variante | Lesson |
|-------|----------|--------|
| R1-V4 | Neon synthwave | DEMASIADO videojuego, pierde profesionalismo |
| R1-V5 | Editorial split | Modelo confunde "harness" con cableado automotriz, mete logos de coches |
| R2-V1 | iPhone bevel button | Esquinas duras NO funcionan, sienten "boton" no "card" |
| R2-V2 | Apple Event minimal | Demasiado plano, falta personalidad SaaS Factory |
| R2-V3 | **Liquid metal premium** | **GANADORA**: chrome flowing organico, depth, dramatic |
| R2-V4 | Aristocratic | Modelo invento logos consultoria (Acquired, McKinsey) |
| R3-V5 | Editorial depth | Bug: subtitulo "Inter Regular" como texto literal del prompt |

Insight: el modelo Nano Banana 2 hace BIEN el liquid metal flowing organico. Hace MAL las esquinas duras tipo iPhone button. Hace MAL composiciones editoriales tipo magazine (mete elementos ajenos).

---

*Actualizar este spec cuando se valide nuevo patron exitoso.*
