# SaaS Factory Deck Style — Manifestacion HTML del Titaniumorphism

> **Sub-spec del sistema unificado [Titaniumorphism](./style-titaniumorphism.md).**
> Este archivo cubre la manifestacion **HTML/CSS** (decks de presentacion).
> Para la manifestacion **Imagen** (PNG via Nano Banana 2), ver el umbrella spec.
>
> Validado en `youtube/videos/deepseek-v4/index.html` (30 abril 2026).
> Daniel iterations: R1 → R2-V3 → R3 → final con bezel + screen + #ff9101 puro.
>
> **El sistema padre Titaniumorphism define filosofia + paleta + reglas duras compartidas.**
> Este archivo solo agrega los detalles especificos del medium HTML (variables CSS, componentes,
> selectores, validacion grep).

## Cuando usar este estilo

| Usar | NO usar |
|------|---------|
| Decks HTML para video manifestos | Imagenes generadas (usar liquid-metal spec) |
| Pillar content presentations | Tutoriales casuales (usar sketchnote) |
| Brand-forward slides (SaaS Factory deck) | Slides educativas con sketchnote |
| Pitch decks / pitch presentations | Carouseles de comunidad |

## Triggers explicitos (Daniel)

- "deck profesional", "presentation HTML", "manifesto deck"
- "estilo SaaS Factory deck", "estilo titanium HTML"
- "deck para video manifesto"

---

## Sistema de variables CSS (copia exacto)

```css
:root {
  /* ===== Brand Purple ===== */
  --primary:        #683ACC;
  --primary-hover:  #5A32B3;
  --neon-purple:    #552EA8;
  --accent-purple:  #8B5CF6;
  --accent-purple-2:#A78BFA;

  /* ===== GOLD MOSTAZA — STANDARD #ff9101 PURO =====
     IMPORTANTE: NO usar derivados naranjas (#ffae42) ni cream (#fdf4d2).
     Solo variaciones de luminosidad del MISMO tono mostaza. */
  --gold:           #ff9101;
  --gold-bright:    #ffac3d;  /* mostaza claro, mismo tono */
  --gold-dark:      #cc7301;  /* mostaza oscuro, mismo tono */
  --gold-deep:      #7a3c08;
  --gold-highlight: #ffac3d;  /* alias del bright (NO cream amarillo) */

  /* ===== Titanium para text gradients ===== */
  --titanium-light: #f7f8f8;
  --titanium-text-mid: #a1a1aa;
  --titanium-text-dark: #52525b;

  /* ===== Titanium Black Brushed (bezel + screen system) ===== */
  --titanium-top:        #24242b;  /* gradient top - mas claro */
  --titanium-mid:        #16161c;  /* gradient mid */
  --titanium-bot:        #0d0d12;  /* gradient bot - mas oscuro */
  --titanium-border:     #2c2c34;  /* border lateral/inferior */
  --titanium-border-top: #42424c;  /* border-top mas claro = simula luz arriba */
  --titanium-bezel:      #0a0a0a;  /* bezel exterior puro */
  --titanium-screen-top: #1c1c1c;  /* screen interior gradient top */
  --titanium-screen-bot: #141418;  /* screen interior gradient bot */

  /* ===== Background system ===== */
  --bg:             #09090b;
  --bg-2:           #0d0d10;
  --surface:        #111114;
  --card:           #1a1a1e;
  --fg:             #f7f8f8;
  --fg-soft:        #d4d4d8;
  --muted:          #a1a1aa;
  --muted-2:        #71717a;
  --border:         #27272a;
  --glass-bg:       rgba(255,255,255,0.04);
  --glass-border:   rgba(139,92,246,0.18);

  /* ===== Glows ===== */
  --glow-purple:    0 0 40px rgba(104,58,204,0.30), 0 12px 60px rgba(104,58,204,0.18);
  --glow-purple-strong: 0 0 80px rgba(104,58,204,0.45), 0 24px 80px rgba(104,58,204,0.25);
  --glow-gold:      0 0 32px rgba(255,145,1,0.32);

  /* ===== Titanium gradient para text 3D effect =====
     Centrado en #ff9101 puro, 30% del gradient es color base. */
  --titanium-gradient: linear-gradient(135deg, #ffac3d 0%, #ff9101 35%, #ff9101 65%, #cc7301 100%);
  --titanium-gradient-vertical: linear-gradient(180deg, #ffac3d 0%, #ff9101 50%, #cc7301 100%);
}
```

**REGLA #1 (no negociable):** nunca usar `#fdf4d2` (cream amarillo) ni `#ffae42` (naranja) en gradients gold. Eso tinta el color hacia naranja/cream y rompe la identidad mostaza.

---

## Receta del borde 3D titanium (la magia visual)

**4 box-shadows combinadas** = efecto 3D real. Aplica a stat cards, dots, counter bezel, cualquier "panel" del deck.

```css
.titanium-card {
  /* Background gradient titanium */
  background: linear-gradient(180deg, var(--titanium-top) 0%, var(--titanium-mid) 50%, var(--titanium-bot) 100%);

  /* Borders diferenciados (key del efecto) */
  border: 1px solid var(--titanium-border);
  border-top: 1px solid var(--titanium-border-top);  /* mas claro arriba = simula luz */

  border-radius: 16px;
  padding: 24px 28px;

  /* La magia: 4 box-shadows */
  box-shadow:
    /* 1. Highlight superior interno (luz desde arriba) */
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    /* 2. Sombra inferior interna (profundidad bottom) */
    inset 0 -1px 0 rgba(0, 0, 0, 0.4),
    /* 3. Borde 1px casi invisible (lo que define el "carved") */
    inset 0 0 0 1px rgba(255, 255, 255, 0.02),
    /* 4. Glow purple sutil (brand identity) */
    0 0 0 1px rgba(139, 92, 246, 0.12),
    /* 5. Outer drop shadow (lift del fondo) */
    0 12px 32px rgba(0, 0, 0, 0.5);
}
```

### Por que se ve 3D (la fisica visual)

3 principios que el cerebro lee como "tridimensional":

1. **Luz desde arriba** — el `inset 0 1px 0 rgba(255,255,255,0.12)` simula luz superior. Sin esto, todo se ve plano.
2. **Sombra opuesta a la luz** — el `inset 0 -1px 0 rgba(0,0,0,0.4)` cae al lado contrario. Cerebro infiere volumen.
3. **Borde 1px casi invisible** — define el "carved" sin gritarlo. Separa la pieza del fondo.

**REGLA: minimo 2 sombras inset** (highlight arriba + shadow abajo). Una sola = se ve plano.

---

## Componente: Counter pagina (Bezel + Screen)

El componente firma del deck. Doble capa: bezel exterior + screen hundido tipo reloj digital.

### HTML

```html
<div class="counter">
  <div class="counter-screen">
    <span class="current">01</span>
    <span class="sep">/</span>
    <span class="total">16</span>
  </div>
</div>
```

### CSS

```css
.counter {
  position: fixed;
  top: 24px; right: 32px;
  z-index: 20;
  user-select: none;

  /* Bezel exterior (titanium black brushed) */
  background: linear-gradient(180deg, var(--titanium-top) 0%, var(--titanium-mid) 50%, var(--titanium-bot) 100%);
  border: 1px solid var(--titanium-border);
  border-top: 1px solid var(--titanium-border-top);
  border-radius: 16px;
  padding: 5px;  /* IMPORTANT: padding interior define el "marco" del bezel */
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(139, 92, 246, 0.08);
}

.counter-screen {
  /* Screen hundido (interior carved) */
  background: linear-gradient(180deg, var(--titanium-screen-top) 0%, var(--titanium-screen-bot) 100%);
  border-radius: 11px;  /* IMPORTANT: < 16px del outer para efecto "marco" */
  padding: 9px 18px;
  display: flex;
  align-items: baseline;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.8),       /* hundido pronunciado */
    inset 0 -1px 0 rgba(255, 255, 255, 0.04),  /* highlight inferior sutil */
    inset 0 0 0 1px rgba(255, 255, 255, 0.02);
}

.counter .current {
  color: var(--gold);  /* #ff9101 SOLIDO, NO gradient */
  font-weight: 700;
  font-size: 24px;
  letter-spacing: 0.02em;
  line-height: 1;
  text-shadow:
    0 0 12px rgba(255, 145, 1, 0.5),
    0 0 24px rgba(255, 145, 1, 0.25),
    0 1px 0 rgba(0, 0, 0, 0.6);
}

.counter .sep {
  color: var(--muted-2);
  margin: 0 8px;
  font-weight: 400;
  font-size: 14px;
}

.counter .total {
  color: var(--titanium-text-mid);
  font-weight: 600;
  font-size: 14px;
}
```

### Las 3 reglas que NO puedes romper

1. **Siempre 2 sombras inset minimo** (highlight arriba + shadow abajo).
2. **Background del screen mas oscuro que el bezel** = simula que el screen esta hundido.
3. **border-radius del inner < outer** (11px screen vs 16px bezel). Si son iguales, se pierde efecto de "marco".

---

## Componente: Stat Card (Slide CTA)

Cards titanium black brushed para datos numericos.

### HTML

```html
<div class="stat-grid">
  <div class="stat">
    <div class="label">COMUNIDAD</div>
    <div class="value purple">600+ Arquitectos</div>
  </div>
  <div class="stat">
    <div class="label">PRECIO</div>
    <div class="value gold">$39 / mes</div>
  </div>
</div>
```

### CSS

```css
.stat-grid {
  margin-top: 56px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  max-width: 920px;
  margin-left: auto;
  margin-right: auto;
}

.stat {
  padding: 24px 28px;

  /* Titanium Black Brushed gradient */
  background: linear-gradient(180deg, var(--titanium-top) 0%, var(--titanium-mid) 50%, var(--titanium-bot) 100%);

  border: 1px solid var(--titanium-border);
  border-top: 1px solid var(--titanium-border-top);
  border-radius: 16px;
  text-align: left;

  /* 4 box-shadows */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.02),
    0 0 0 1px rgba(139, 92, 246, 0.12),
    0 12px 32px rgba(0, 0, 0, 0.5);
}

.stat .label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--muted-2);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.stat .value {
  font-size: 32px;
  font-weight: 800;
  color: var(--fg);
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: -0.02em;
}

.stat .value.purple { color: var(--accent-purple-2); }

.stat .value.gold {
  /* Gradient titanium gold con efecto 3D */
  background: var(--titanium-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 1px 3px rgba(255,145,1,0.4));
}
```

---

## Componente: Dots Container (Navigation)

Bezel titanium tactile para los dots de navegacion abajo.

### HTML

(Generado dinamicamente por JS)

```html
<div class="dots">
  <span class="dot active"></span>
  <span class="dot"></span>
  <!-- ... mas dots -->
</div>
```

### CSS

```css
.dots {
  position: fixed;
  bottom: 32px; left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 20;
  padding: 12px 18px;

  /* Titanium bezel exterior */
  background: linear-gradient(180deg, var(--titanium-top) 0%, var(--titanium-mid) 50%, var(--titanium-bot) 100%);
  border: 1px solid var(--titanium-border);
  border-top: 1px solid var(--titanium-border-top);
  border-radius: 100px;

  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(139, 92, 246, 0.10),
    0 12px 32px rgba(0, 0, 0, 0.55);
}

.dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.14);
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  cursor: pointer;
}

.dot:hover { background: rgba(255,255,255,0.4); }

.dot.active {
  width: 36px;
  border-radius: 4px;
  /* Gradient triple: purple → accent → gold mostaza */
  background: linear-gradient(90deg, var(--primary), var(--accent-purple-2), var(--gold));
  box-shadow: 0 0 14px var(--primary), 0 0 8px rgba(255,145,1,0.4);
}
```

---

## Componente: Brand con logo SF circular (Top-left)

Logo circular sutil + pulse animado titanium liquid en gold mostaza.

### HTML

```html
<div class="brand">
  <img src="images/sflogo.png" class="brand-logo" alt="SaaS Factory">
  <span class="pulse"></span>
  SaaS Factory · Daniel Carreon
</div>
```

**REGLA: el logo SF circular es OBLIGATORIO en todos los decks** (estandar 30 abr 2026).
Path canonico: copiar `youtube/assets/logos/tools/sflogo.png` a `images/sflogo.png` del video.

### CSS

```css
.brand {
  position: fixed;
  top: 24px; left: 32px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  z-index: 20;
  user-select: none;
}

.brand-logo {
  /* Logo SaaS Factory circular sutil elegante (NUEVO standard 30 abr 2026) */
  width: 26px;
  height: 26px;
  border-radius: 50%;     /* mascara circular */
  object-fit: cover;
  opacity: 0.92;
  border: 1px solid rgba(255,145,1,0.25);
  box-shadow:
    0 0 10px rgba(255,145,1,0.18),
    inset 0 1px 0 rgba(255,255,255,0.08);
}

.brand .pulse {
  width: 8px; height: 8px;
  border-radius: 50%;

  /* Pulse con efecto titanium liquid (3D sphere feel) */
  background: radial-gradient(circle at 30% 30%, var(--gold-highlight), var(--gold) 50%, var(--gold-dark) 100%);

  box-shadow:
    0 0 12px rgba(255,145,1,0.6),
    0 0 24px rgba(255,145,1,0.3),
    inset 0 1px 1px rgba(255,255,255,0.5),
    inset 0 -1px 1px rgba(0,0,0,0.3);

  animation: pulse-titanium 2.5s ease-in-out infinite;
}

@keyframes pulse-titanium {
  0%, 100% {
    opacity: 0.85;
    transform: scale(0.95);
    box-shadow: 0 0 14px rgba(255,145,1,0.5), 0 0 28px rgba(255,145,1,0.25), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 1px rgba(0,0,0,0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.18);
    box-shadow: 0 0 22px rgba(255,145,1,0.75), 0 0 44px rgba(255,145,1,0.4), inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -1px 1px rgba(0,0,0,0.3);
  }
}
```

---

## Componente: Progress Bar Top

Barra superior con gradient titanium completo.

### HTML

```html
<div class="progress-rail"><div class="fill"></div></div>
```

### CSS

```css
.progress-rail {
  position: fixed;
  top: 0; left: 0;
  width: 100%;
  height: 3px;
  background: rgba(255,255,255,0.04);
  z-index: 20;
}

.progress-rail .fill {
  height: 100%;

  /* Gradient: purple → accent → gold-bright → gold → gold-dark */
  background: linear-gradient(90deg,
    var(--primary) 0%,
    var(--accent-purple-2) 40%,
    var(--gold-bright) 60%,
    var(--gold) 80%,
    var(--gold-dark) 100%);

  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);

  box-shadow:
    0 0 12px rgba(104,58,204,0.6),
    0 0 24px rgba(255,145,1,0.3);

  width: 0;
}
```

---

## Tipografia: Titulos H1 con efecto titanium

Para slides de texto, los titulos pueden tener spans con efectos especiales:

```css
.slide-text h1 {
  font-size: clamp(48px, 7.4vw, 116px);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.02;
  color: var(--fg);
}

/* Span purple gradient (concept word) */
.slide-text h1 .accent {
  background: linear-gradient(135deg, var(--accent-purple-2) 0%, var(--primary) 60%, var(--neon-purple) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 30px rgba(104,58,204,0.45));
}

/* Span gold mostaza con efecto 3D */
.slide-text h1 .gold {
  background: var(--titanium-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 2px 8px rgba(255,145,1,0.4)) drop-shadow(0 0 24px rgba(255,145,1,0.25));
}

/* Span tachado (concept negativo) */
.slide-text h1 .strike {
  text-decoration: line-through;
  text-decoration-color: rgba(244,63,94,0.7);
  text-decoration-thickness: 6px;
  color: var(--muted);
}
```

### Uso

```html
<h1>El <span class="accent">harness</span> es el activo.<br>El modelo es <span class="gold">commodity</span>.</h1>

<h1>Vendes <span class="strike">tiempo</span> o vendes <span class="gold">activos</span>.</h1>
```

---

## Backgrounds del body (atmosfera)

```css
body::before {
  content: '';
  position: fixed; inset: 0;
  background:
    radial-gradient(ellipse 120% 80% at 50% -20%, rgba(104,58,204,0.16), transparent 60%),
    radial-gradient(ellipse 80% 60% at 100% 100%, rgba(255,145,1,0.04), transparent 50%),
    repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,255,255,0.008) 2px, rgba(255,255,255,0.008) 3px),
    var(--bg);
  pointer-events: none;
  z-index: 0;
}

/* Particulas flotando */
body::after {
  content: '';
  position: fixed; inset: 0;
  background-image:
    radial-gradient(1px 1px at 20% 30%, rgba(167,139,250,0.4), transparent),
    radial-gradient(1px 1px at 70% 60%, rgba(255,145,1,0.3), transparent),
    radial-gradient(1px 1px at 40% 80%, rgba(104,58,204,0.5), transparent),
    radial-gradient(1px 1px at 85% 15%, rgba(167,139,250,0.3), transparent),
    radial-gradient(1px 1px at 10% 70%, rgba(255,145,1,0.25), transparent);
  pointer-events: none;
  z-index: 0;
  animation: drift 60s linear infinite;
}

@keyframes drift {
  from { transform: translate(0, 0); }
  to { transform: translate(-40px, -20px); }
}
```

---

## Iteraciones aprendidas (lessons learned)

| Round | Lo que probamos | Resultado |
|-------|----------------|-----------|
| R1-V4 | Neon synthwave | DEMASIADO videojuego, pierde profesionalismo |
| R2-V1 | iPhone bevel button (esquinas duras) | Esquinas duras NO funcionan, sienten "boton" no "card" |
| R2-V3 | **Liquid metal premium** | **Daniel top pick para imagenes generadas** |
| Counter v1 | Solo gradient text en numero | Muy plano, sin profundidad |
| Counter v2 | Bezel + screen doble capa | **WINNER** efecto reloj digital |
| Gold v1 | `#FFD700` amarillo electrico | Muy electrico, no se sentia mostaza |
| Gold v2 | `#ff9101` con gradient `#fdf4d2` cream | Tinta hacia naranja-cream, no mostaza puro |
| Gold v3 | `#ff9101` con gradient mostaza-only | **WINNER** mantiene tono mostaza puro |

### Reglas duras aprendidas

1. **NO `#fdf4d2`** (cream amarillo) en gradients gold. Tinta hacia amarillo crema.
2. **NO `#ffae42`** (naranja claro) en gradients gold. Tinta hacia naranja.
3. **SI `#ffac3d`** (mostaza claro) y **SI `#cc7301`** (mostaza oscuro) — variaciones del mismo tono.
4. **30% del gradient gold debe ser `#ff9101` puro** (entre 35% y 65% del stop).
5. **Counter SIEMPRE doble capa** (bezel + screen). Single layer = plano.
6. **Cards SIEMPRE 4 box-shadows** (highlight + shadow + 1px subtle + outer drop).
7. **`border-top` SIEMPRE mas claro** que `border` lateral/inferior. Eso simula luz superior.

---

## Template HTML reusable

Ver: `youtube/_playbooks/deck-template-saas-factory.html`

Es un copy-paste listo para nuevos videos. Cambias solo:
- Titulos de slides
- Imagenes referenciadas
- Numero de slides (counter total)
- Caption labels

Todo el sistema CSS ya esta cocinado.

---

## Validacion del color

Si Daniel dice "se ve mas naranja" o "se ve mas amarillo", verificar:

```bash
# Buscar tonos prohibidos en el HTML
grep -E "#fdf4d2|#ffae42|#FFD700" youtube/videos/X/index.html
```

Si retorna match, esos colores tintaron el gradient. Reemplazar por:
- `#fdf4d2` → `#ffac3d` o eliminar
- `#ffae42` → `#ffac3d`
- `#FFD700` → `#ff9101`

---

## Archivo fuente validado

`youtube/videos/deepseek-v4/index.html` (30 abril 2026)

Ese es el archivo de referencia funcional. Si modifico este spec sin actualizar el archivo de referencia, el spec queda desincronizado.

---

*Daniel Carreon · SaaS Factory · 30 abril 2026 · 4 iteraciones para llegar al estilo definitivo.*
