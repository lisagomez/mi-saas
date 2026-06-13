# Titaniumorphism — Sistema de Diseño Unificado

> **Sistema de design propio inventado el 30 Abr 2026** por Daniel Carreon + Levy.
> NO existe en literatura UI (no es Glassmorphism, Neumorphism, Skeuomorphism, ni Claymorphism).
> Es activo conceptual de marca personal.
>
> **UN sistema con DOS manifestaciones**: HTML (decks) e Imagen (PNG generada).

---

## Definicion en una frase

> Premium hardware feel + glassmorphic interior + bezel/screen doble capa hundido + outline tenue + dot esquina como sello + serif tipografia editorial + 4 box-shadows recipe.

## Manifestaciones

| Manifestacion | Medium | Spec detallado | Cuando usar |
|---------------|--------|----------------|-------------|
| **HTML Deck** | CSS render | `references/deck-style-saas-factory.md` | Presentaciones, decks, manifestos en HTML completo |
| **Imagen Cards (V5 Bezel)** | PNG via Nano Banana 2 | Este archivo (seccion abajo) | Datos discretos, comparativas paralelas, hero brand-forward |
| **Imagen Sketchnote Dark** | PNG via Nano Banana 2 | `references/style-sketchnote-dark.md` | Conceptos abstractos, narrativas, antes/despues, personajes |

Las 3 manifestaciones comparten **filosofia + reglas duras + paleta**. Solo difieren en como se renderizan.

---

## Matriz de decision: Cards vs Sketchnote Dark (dentro del paraguas)

| Tipo de slide | Manifestacion | Por que |
|---------------|---------------|---------|
| **Datos discretos** (77.2%, $25/M, 367k stars, 23.2x) | **Cards (V5 Bezel)** | Precision, comparacion numerica, scan visual rapido |
| **Comparativas paralelas 3-5 items** | **Cards (V5 Bezel)** | Estructura grid clara |
| **Conceptos abstractos** (piramide IP, harness vs modelo, timeline) | **Sketchnote Dark** | Hand-drawn cuenta historia |
| **Antes/Despues, Causa/Efecto** (cost collapse, gap closing) | **Sketchnote Dark** | Flechas organicas + narrativa |
| **Personajes / metaforas** (Daniel señalando, robots) | **Sketchnote Dark** | Hand-drawn permite expresion |
| **Frases emblematicas** (hook, twist, punchline) | **Solo texto Cormorant serif** | Punchline puro sin distraccion |

**Heuristica de bolsillo:**
> ¿Lo dirias como dato o lo dibujarias en pizarron?
> Dato → **Cards**. Dibujo → **Sketchnote Dark**.

---

## Tipografia: regla 2-fuentes estricta (validada 30 Abr 2026)

| Fuente | Uso | % del deck |
|--------|-----|------------|
| **Inter ExtraBold** | DEFAULT. Titulos, subtitulos, labels, body, contadores | **~90%** |
| **Cormorant Garamond Italic** | Solo punchlines emblematicos (max 3-5 slides: hook, twist, cierre) | **~10%** |

**Quitamos JetBrains Mono** del deck (era 3era fuente). Si necesitamos monospace en una metrica, usamos `font-feature-settings: 'tnum'` sobre Inter (tabular numbers).

**En sketchnote PNG:** el hand-lettering YA esta dentro de la imagen, NO cuenta como tipografia web. Sigue siendo regla 2-fuente.

**Anti-patron:** usar Cormorant Garamond para TODO titulo (versiones anteriores). Termina aburriendo + se siente uniforme. Cormorant solo para 3-5 punchlines maximo, el resto Inter ExtraBold.

---

## Por que es nuevo (no existia antes)

| Sistema existente | Que tiene | Que le falta |
|-------------------|-----------|--------------|
| **Glassmorphism** (2021) | Frosted blur translucido | Sin chassis hardware, sin bezel hundido |
| **Neumorphism** (2020) | Soft shadows | Plano, sin doble capa, sin border-top luz |
| **Skeuomorphism** (iOS 6) | Simulacion fisica generica | No especifico de chassis titanium digital |
| **Liquid Metal** (Apple concept) | Flowing organico | Demasiado pesado, neon-ish |

**Titaniumorphism = chassis fisico hardware + glass interior + screen hundido digital.** Sensacion de pieza de hardware (reloj de lujo, dashboard automotriz, iPhone titanium chassis).

Nadie lo ha formalizado. Daniel lo nombra primero.

---

## Filosofia del sistema

### 1. Chassis sobre Cristal sobre Pantalla
El elemento es **un objeto fisico**, no un panel flat. Tiene:
- **Chassis exterior** (bezel) que sostiene la pieza
- **Cristal/glass intermedio** que da el toque premium
- **Pantalla interior hundida** donde vive el contenido

### 2. Luz superior, sombra inferior
Siempre hay una **luz que viene de arriba**. Por eso:
- `border-top` mas claro que `border` lateral/inferior
- Highlight inset arriba blanco al 10%
- Shadow inset abajo negro al 40%

### 3. Outline tenue, dot solido
El color de marca aparece en:
- **Outline 1.5px** del border-top (sutil, no flowing pesado)
- **Dot solido 8px circular** en esquina superior izquierda (sello de marca)

NO se usa color flowing por toda la card. NO se usa neon. NO se usa gradiente saturado.

### 4. Serif elegante para gravitas
Los titulos principales usan **serif elegante** (tipo Garamond/Bodoni) — da aire editorial premium, distinto de tech-bro Inter Bold genérico.

Subtitulos: **serif italica gris**.
Body/UI: Inter Bold blanco.
Tecnico/numerico: JetBrains Mono.

### 5. Espacio negativo abundante
Padding interno minimo 10%. La pieza respira. NO llenar bordes.

---

## Paleta del sistema (compartida HTML + Imagen)

### Colores hex hardcoded

| Rol | Hex | Aplicacion |
|-----|-----|-----------|
| **Fondo principal** | `#09090b` | Background de toda la composicion |
| **Bezel top** | `#24242b` | Gradient bezel parte superior |
| **Bezel mid** | `#16161c` | Gradient bezel medio |
| **Bezel bot** | `#0d0d12` | Gradient bezel parte inferior |
| **Border bezel** | `#2c2c34` | Border lateral/inferior |
| **Border-top bezel** | `#42424c` | Border superior (simula luz) |
| **Screen top** | `#1c1c1c` | Pantalla interior gradient top |
| **Screen bot** | `#141418` | Pantalla interior gradient bot |
| **Card glass** | `#1a1a1e` | Glassmorphic frosted interior |
| **Purple primary** | `#683ACC` | Acento izquierdo (harness/concepto principal) |
| **Gold standard** | `#ff9101` | Acento derecho (modelo/oferta/precio) |
| **Texto principal** | `#f7f8f8` | Inter Bold blanco |
| **Texto secundario** | `#d4d4d8` | Subtitulos serif italica |
| **Muted** | `#a1a1aa` | Captions y labels |

### Variantes del gold (NO negociable)

- **OK** `#ff9101` puro (mostaza)
- **OK** `#ffac3d` (mostaza claro, +luminosidad mismo tono)
- **OK** `#cc7301` (mostaza oscuro, -luminosidad mismo tono)
- **PROHIBIDO** `#FFD700` (amarillo electrico)
- **PROHIBIDO** `#fdf4d2` (cream amarillo)
- **PROHIBIDO** `#ffae42` (naranja claro)

30% del gradient gold debe ser `#ff9101` puro (entre 35-65% de stops).

---

## Anatomia compartida (HTML + Imagen)

```
ELEMENTO TITANIUMORPHISM
├── BEZEL EXTERIOR (chassis)
│   ├── gradient 180deg: #24242b → #16161c → #0d0d12
│   ├── border: 1px solid #2c2c34
│   ├── border-top: 1px solid #42424c (luz superior)
│   ├── border-radius: 20px (esquinas suaves)
│   └── 4 box-shadows recipe:
│       1. inset 0 1px 0 rgba(255,255,255,0.10)  ← highlight top
│       2. inset 0 -1px 0 rgba(0,0,0,0.4)        ← shadow bottom
│       3. inset 0 0 0 1px rgba(255,255,255,0.02) ← subtle border interior
│       4. 0 12px 32px rgba(0,0,0,0.5)            ← outer drop dimensional
│
├── ACENTO COLOR (semantico)
│   ├── Outline 1.5px en border-top (purple izq / gold der)
│   └── Dot solido 8px CIRCULAR en esquina sup-izq como sello
│
└── SCREEN INTERIOR HUNDIDO (pantalla)
    ├── gradient 180deg: #1c1c1c → #141418
    ├── border-radius: 14px (MENOR que bezel, se ve encajado)
    ├── inset shadow: 0 2px 6px rgba(0,0,0,0.8) (3D hundido)
    └── Contenido (icono + titulo + subtitulo)
```

### Tilt 3D sutil (opcional)
- Card izq: `rotate(-1deg)` o `rotate(-2deg)`
- Card der: `rotate(+1deg)` o `rotate(+2deg)`
- Mas pronunciado = mas editorial. Mas sutil = mas tech.

---

## Reglas duras compartidas (NO violar)

1. **REGLA 80/20 (CRITICA)**: 80% de los slides del deck son IMAGENES Titaniumorphism (Nano Banana 2). Solo 20% son slides texto, y SOLO para frases emblematicas (hook, punchlines, twist, CTA frase). NO llenar slides de texto. Si tienes que decirlo con palabras, hazlo en imagen Titaniumorphism con tipografia integrada.
2. **DOBLE TIPOGRAFIA OBLIGATORIA** (validado V5 Bezel ganador):
   - **Serif Garamond/Bodoni** (Cormorant Garamond) para titulos principales arriba — elegante, editorial, italica para subtitulos
   - **Inter Bold sans-serif** para labels enormes dentro de cards (HARNESS, MODELO, etc.) — directo, tech-forward, glow color
   - **JetBrains Mono** para counter, eyebrow, datos numericos
   - La armonia entre serif (titulo) + Inter Bold (labels card) es lo que hace al sistema premium-pero-tech.
3. **Doble capa OBLIGATORIA**: bezel exterior + screen interior hundido. Nunca elemento flat.
4. **border-top mas claro** que border lateral/inferior. Simula luz superior.
5. **4 box-shadows recipe** completa. Falta una capa = pierde dimensionalidad.
6. **Outline tenue** 1.5px max en border-top, NO liquid metal flowing pesado, NO neon.
7. **Dot esquina CIRCULAR** 8px solido.
8. **Esquinas suaves redondeadas** radius 20px bezel / 14px screen.
9. **Iconos chrome silver** dentro del screen (no encima del bezel).
10. **Logos clasificados 4+4** (harnesses/LLMs) en mini-cards inferiores.
11. **Espacio negativo 10%** padding interno minimo.
12. **NO anotaciones flotantes** pedagogicas (V4 fail: typos basura).

---

## Manifestacion 1: HTML Deck

**Spec detallado:** [`deck-style-saas-factory.md`](./deck-style-saas-factory.md)

Ahi vive:
- Variables CSS completas (`--titanium-*`, `--gold`, etc.)
- Componentes HTML/CSS: counter bezel+screen, stat cards, brand chrome, dots, progress rail
- Reglas de slide-image (`aspect-ratio: 16/9` estricto)
- Logo SF circular obligatorio en brand chrome
- Triggers, validacion grep, setup nuevo video

**Template listo para copiar:** `youtube/_playbooks/deck-template-saas-factory.html`
**Referencia validada:** `youtube/videos/deepseek-v4/index.html`

---

## Manifestacion 2: Imagen (PNG via Nano Banana 2)

### Cuando usar

| Usar | NO usar |
|------|---------|
| Slides imagen dentro del deck HTML | Tutoriales casuales (usar sketchnote) |
| Hero images de manifesto | Build in public casual (usar sketchnote) |
| Comparativas premium (versus, before/after) | Carouseles comunidad |
| Brand-forward content | Reaction videos |

### Triggers explicitos (Daniel)

- "estilo titaniumorphism", "titanium con bezel"
- "premium hardware feel"
- "imagen tipo reloj digital de lujo"
- "estilo iPhone titanium con pantalla hundida"

### Tipografia (manifestacion imagen)

| Elemento | Estilo |
|----------|--------|
| **Titulo principal arriba** | Serif tipo Garamond/Bodoni, blanco, ENORME, elegante |
| **Subtitulo arriba** | Serif italica gris claro, mediano |
| **Titulo card (HARNESS/MODELO)** | Inter Bold blanco grande, dentro del screen, con text-shadow glow color |
| **Subtitulo card** | Serif italica gris, pequeno, debajo del titulo card |
| **Logos labels** | Inter Regular pequeno, en mini-cards inferiores |

### Iconos (manifestacion imagen)

- **Isometricos silver chrome** lineart con sutil reflejo
- Centrados dentro del screen interior hundido
- NO doodle, NO sketchnote, NO 3D fotorrealistico

### Mini-cards de logos (inferiores)

- 4 logos en fila, en zona del **bezel** (NO dentro del screen)
- Cada logo en su propio mini-frame con sutil glow del color de marca
- Floating con micro box-shadow
- Clasificados estricto: harnesses lado izq / LLMs lado der

### Prompt canonico (V5 Bezel — verbatim, ganador 30 Abr 2026)

```
Composicion 16:9 estilo TITANIUMORPHISM BEZEL (efecto Counter HTML aplicado a las cards: doble capa visual outer chrome bezel + inner screen hundido tipo reloj digital de lujo).

Fondo dark #09090b con brushed titanium texture horizontal y soft glow ambient.

Dos cards grandes con DOBLE CAPA visual (esto es lo distintivo de esta variante):
- BEZEL EXTERIOR: gradient titanium black brushed (top #24242b → mid #16161c → bot #0d0d12), border-top mas claro #42424c que simula luz superior, 4 box-shadows recipe titanium completa.
- SCREEN INTERIOR HUNDIDO: gradient mas oscuro (#1c1c1c → #141418), border-radius MENOR que el bezel (interior parece encajado adentro como pantalla), inset shadow profunda 6px rgba(0,0,0,0.8) para sensacion 3D hundido.

Esquinas suaves redondeadas radius 20px (bezel) / 14px (screen interior).
Tilt 3D sutil (-1deg / +1deg).

CARD IZQUIERDA — bezel titanium chrome:
- Acento color via outline 1.5px purple #683ACC en el border-top del bezel.
- Dot solido 8px purple esquina superior izq sello marca.
- Screen interior hundido contiene: icono isometrico silver chrome de chasis al centro.
- Titulo Inter Bold blanco grande dentro del screen: 'HARNESS' (con sutil text-shadow glow purple).
- Subtitulo serif italica gris: 'el chasis del agente'.
- Mini-cards 4 logos en fila inferior (separados del screen, en zona del bezel): Claude Code, Cursor, OpenCode, Hermes.

CARD DERECHA — bezel simetrico:
- Acento naranja calido #ff9101 en border-top del bezel.
- Dot 8px naranja esquina superior izq.
- Screen interior con icono isometrico silver chrome de motor.
- Titulo Inter Bold blanco: 'MODELO' (text-shadow glow naranja).
- Subtitulo serif italica gris: 'commodity intercambiable'.
- Mini-cards inferiores: Claude, DeepSeek, Qwen, Kimi.

Titulo arriba serif elegante blanco enorme: 'HARNESS vs MODELO'.
Subtitulo italica abajo gris: 'EL COCHE ES TUYO. EL MOTOR LO ROTAS'.

Espacio negativo balanceado, padding interno 10%.
Sensacion: premium hardware reloj de lujo digital + iPhone titanium chassis + dashboard automotriz alta gama.
La diferencia clave: las cards no son flat, son DIMENSIONALES con efecto bezel + pantalla hundida adentro como una pieza fisica de hardware.
NO neon, NO videojuego, NO crema, NO doodles, NO bevel duro tipo boton.
TODO el texto en ESPAÑOL. Formato 16:9 estricto.
```

### Plantilla generalizada del prompt

Para nuevas escenas (no solo HARNESS vs MODELO), adaptar:

```
Composicion 16:9 estilo TITANIUMORPHISM BEZEL.

Fondo dark #09090b con brushed titanium texture horizontal y soft glow ambient.

[N cards grandes / disposicion] con DOBLE CAPA visual:
- BEZEL EXTERIOR: gradient titanium black brushed (#24242b → #16161c → #0d0d12), border-top #42424c, 4 box-shadows recipe.
- SCREEN INTERIOR HUNDIDO: gradient (#1c1c1c → #141418), radius MENOR, inset shadow profunda.

Esquinas radius 20px (bezel) / 14px (screen). Tilt 3D sutil (-1deg / +1deg).

[Por cada card]:
- Acento color [purple #683ACC | gold #ff9101 | otro] en border-top.
- Dot solido 8px [color] esquina superior izq.
- Screen interior contiene: icono isometrico silver chrome [DESCRIPCION].
- Titulo Inter Bold blanco: '[NOMBRE]' (text-shadow glow [color]).
- Subtitulo serif italica gris: '[descripcion corta pedagogica]'.
- Mini-cards inferiores con [N logos]: [LISTAR].

Titulo arriba serif elegante blanco enorme: '[TITULO]'.
Subtitulo italica abajo gris: '[SUBTITULO]'.

Espacio negativo balanceado, padding interno 10%.
Sensacion: premium hardware reloj de lujo digital + iPhone titanium chassis.
NO neon, NO videojuego, NO crema, NO doodles, NO bevel duro tipo boton, NO anotaciones flotantes.
TODO el texto en ESPAÑOL. Formato 16:9 estricto.
```

### Refs (--refs) recomendados (manifestacion imagen)

Para HARNESS vs MODELO (ejemplo canonico, 8 refs total):

```bash
--refs \
  youtube/assets/logos/harnesses/claudecode.png \
  youtube/assets/logos/harnesses/cursor.png \
  youtube/assets/logos/harnesses/opencode.png \
  youtube/assets/logos/harnesses/hermes.jpg \
  youtube/assets/logos/llms/claude.png \
  youtube/assets/logos/llms/deepseek.png \
  youtube/assets/logos/llms/qwen.png \
  youtube/assets/logos/llms/kimi.png
```

**Regla:** clasificar siempre 4+4 balanceado. Harnesses lado izq, LLMs lado der. NO mezclar (ver `asset-catalog.md`).

---

## Lessons learned (5 rondas Imagen — 30 Abr 2026)

| Round | Variante | Score | Resultado |
|-------|----------|-------|-----------|
| V1 Pure | Outline + 4 shadows base | 9/10 | Equilibrio limpio premium |
| V2 Editorial | R3-V3 dominante, mas vacio | 7.5/10 | Logos ilegibles por demasiado espacio |
| V3 Liquid | R2-V3 dominante con halos | 7/10 | Bug: dot derecho cuadrado |
| V4 Didactic | Anotaciones flotantes pedagogicas | 4/10 | **ANTI-PATRON: typos basura en ingles** |
| **V5 Bezel** | **Doble capa bezel + screen** | **8.5/10** | **✓ ESENCIA OFICIAL** |

### Files generados (referencias visuales)

```
youtube/videos/deepseek-v4/images/variantes/
├── titaniumorphism-v1-pure.png
├── titaniumorphism-v2-editorial.png
├── titaniumorphism-v3-liquid.png
├── titaniumorphism-v4-didactic.png  ← ANTI-PATRON
└── titaniumorphism-v5-bezel.png     ← ★ OFICIAL
```

---

## Anti-patrones documentados (PROHIBIDO en HTML e Imagen)

| Anti-patron | Por que falla | Fix |
|-------------|--------------|-----|
| **Anotaciones flotantes pedagogicas** (V4 Imagen fail) | Nano Banana 2 inventa palabras frankenstein en ingles ("pedagogogical annotatioración") | La didactica viene del subtitulo italica solo, no anotaciones extra |
| **Halos liquid metal exagerados** | Cards se ven "neon", pierden premium | Outline 1.5px + halo MUY controlado |
| **Dot esquina cuadrado** (V3 bug) | Modelo a veces dibuja square en lugar de circle | Especificar "dot solido 8px CIRCULAR" |
| **Cards flat sin bezel** | Se ven wireframe Figma, no premium | Bezel + screen DOBLE CAPA siempre |
| **Bevel duro iPhone button** | Esquinas duras se ven "boton" | Esquinas suaves redondeadas radius 20px |
| **Crema hand-drawn** | Eso es sketchnote, no titaniumorphism | Solo dark #09090b |
| **Logos automotrices ajenos** | Modelo confunde "harness" con cableado | Especificar "harness DE IA" + asset-catalog |
| **Subtitulo "Inter Regular" como texto literal** | Bug de prompt (R3-V5) | NO mencionar nombres de fuentes literales en prompt |
| **Synthwave neon** | Videojuego retro, no premium | Solo titanium |
| **max-height sin aspect-ratio** | Corta imagenes en HTML | `aspect-ratio: 16/9` obligatorio en .slide-image .frame |
| **Cara Daniel en TODAS las imagenes** | Sobrecargado | Solo en slide central / hub |

---

## Validacion post-generacion

### Validacion HTML deck
```bash
# Buscar tonos prohibidos
grep -E "#fdf4d2|#ffae42|#FFD700" youtube/videos/X/index.html

# Verificar aspect-ratio en slide-image
grep "aspect-ratio: 16" youtube/videos/X/index.html

# Verificar logo SF brand
grep "brand-logo" youtube/videos/X/index.html
```

### Validacion Imagen Titaniumorphism
1. **Tipografia**: TODO en español, sin palabras en ingles inventadas
2. **Colores**: purple #683ACC izq + gold #ff9101 der
3. **Doble capa**: bezel + screen claramente visible (no flat)
4. **Esquinas**: suaves redondeadas radius 20px bezel / 14px screen
5. **Dot esquina**: circular solido 8px (NO cuadrado)
6. **Logos**: 4+4 clasificados, NO logos automotrices ajenos
7. **Anotaciones**: NO texto flotante extra
8. **Tilt 3D**: sutil -1deg / +1deg

---

## Setup para nuevo video

### HTML deck
```bash
cp youtube/_playbooks/deck-template-saas-factory.html \
   youtube/videos/MI-VIDEO/index.html
mkdir -p youtube/videos/MI-VIDEO/images
cp youtube/assets/logos/tools/sflogo.png \
   youtube/videos/MI-VIDEO/images/
# Editar slides, NO tocar variables CSS ni componentes chrome
```

### Imagen Titaniumorphism
```bash
mkdir -p youtube/videos/MI-VIDEO/images/variantes
cd claudeclaw && npx tsx scripts/generate-image.ts \
  --prompt "[adaptar plantilla generalizada arriba]" \
  --refs [4 harness logos] [4 llm logos] \
  --output youtube/videos/MI-VIDEO/images/variantes/escena-titaniumorphism.png \
  --aspect 16:9 --size 2K
# Validar checklist post-generacion. Si pasa, copiar a images/ como version oficial.
```

---

## Decision tree (cuando usar cada manifestacion)

| Daniel pide | Manifestacion |
|-------------|---------------|
| "Deck HTML completo" / "presentation HTML" | **HTML Deck** (sub-spec deck-style-saas-factory.md) |
| "Imagen para slide del deck" | **Imagen Titaniumorphism** |
| "Hero image manifesto" | **Imagen Titaniumorphism** |
| "Comparativa premium" | **Imagen Titaniumorphism** |
| "Imagen tutorial casual" | NO Titaniumorphism — usar Sketchnote |
| "Imagen liquid metal flowing" | NO Titaniumorphism — usar Liquid Metal (legacy) |

---

## Roadmap de unificacion (futuro)

> **Futura iteracion:** aplicar Titaniumorphism al diseño de SaaS Factory Community (saas-factory-community/).
> Daniel quiere que el sistema de design del producto matchee con su sistema de marca personal.
> Ya casi es identico (paleta dark + purple + gold), pero falta:
> - Implementar bezel + screen en cards del producto
> - Aplicar 4 box-shadows recipe a paneles principales
> - Unificar tipografia (decision pendiente: Inter Bold vs Serif para titulos)
> - Migrar componentes existentes incrementalmente

NO hacer todavia. Por ahora solo unificar specs HTML + Imagen del lado de Levy/Daniel.

---

*Sistema unificado validado el 30 Abr 2026 con video deepseek-v4. Daniel aprobo: V5 Bezel como esencia oficial Imagen + HTML deck con counter bezel+screen, stat cards titanium, color #ff9101 puro, logo SF circular sutil, aspect-ratio 16:9 estricto.*
