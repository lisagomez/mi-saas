# Titaniumorphism — Design System

A premium, cinematic visual language for **fiscal / legal-tech presentations and motion pieces**.
Born from the *Grafo* product film (a graph-based fiscal-intelligence engine). The aesthetic:
**brushed-titanium objects floating in near-black graphite space, connected by a glowing graph,
with one cool-blue accent for "energy / truth" and amber reserved for "risk / the problem."**

The feeling to hit every time: **sober, expensive, engineered, trustworthy.** Slow motion,
generous negative space, metal that catches light, evidence rendered in monospace.

> Sources: this system was extracted from the Grafo presentation video in this project
> (`Grafo — Video.dc.html`, `Grafo.scenes.jsx`). Palette = cool-steel + blue accent variant.

---

## Index / manifest

- **`styles.css`** — root entry; `@import`s all tokens. Link this one file.
- **`tokens/`** — `colors.css`, `typography.css`, `effects.css` (CSS custom properties).
- **`guidelines/`** — foundation specimen cards (Design System tab).
- **`components/presentation/`** — reusable React primitives: `MetalHeading`, `Kicker`,
  `GlassChip`, `KPIStat`, `MetalNode`.
- **`slides/`** — copy-ready 16:9 slide templates: Title, Stat, Lineage, Closing.
- **`SKILL.md`** — Agent-Skill manifest.

---

## CONTENT FUNDAMENTALS

**Voice:** authoritative, calm, precise. We speak in *certainty*, not hype. Spanish (LatAm,
formal "usted" when addressing the client; otherwise impersonal). The product is a **copilot**,
never an oracle: "el sistema entrega la evidencia, el contador firma el criterio."

**Casing:** Sentence case for statements. UPPERCASE only for mono kickers (`EL PROBLEMA`,
`EL VALOR, EN NÚMEROS`) and tiny meta labels. Never all-caps a full sentence.

**Emphasis pattern — three weights of meaning in one line:**
- **Accent blue** = the truth / the win (`firma con evidencia`, `45 segundos con evidencia`).
- **Metal text** = the proof artifact / the brand promise (`prueba de debida diligencia`, `firma el criterio`).
- **Steel-dim** = the thing we negate (`no con suposiciones`, `no un robot que decide`).
- **Amber** = the problem only (`manual`, `fragmentado`, `alto riesgo`).

**Numbers carry the argument.** Lead with the metric, set it huge in mono, annotate small:
`< 45 s` → "−90% vs. el proceso manual". Keep one idea per line; let it breathe for seconds.

**No emoji.** No exclamation. No filler. One thousand no's for every yes.

**Evidence voice (mono):** anything that proves provenance is monospace —
`source_version: LISR-2026.1 · vigente al 12·06·2026`, the lineage chain, the kickers.

---

## VISUAL FOUNDATIONS

**Background** — never flat. A cool radial graphite (`--surface-page`): lifted center
(`#1d232a`) falling to near-black corners (`#0a0c0f`). Over it: a faint brushed-metal diagonal
hatch (`--brushed`, ~5% opacity), one slow drifting blue light-bloom, a **vignette**
(`--vignette`) and ~5% **film grain** (overlay blend). The frame is *alive* — something always
drifts, breathes, or draws.

**The titanium material** — the signature. A multi-stop diagonal gradient (`--metal`) with bright
edges (`#f2f5f8`) and a dark belly (`#646d75`). Used three ways:
1. **Metal text** — clip the gradient to glyphs (`background:var(--metal); -webkit-background-clip:text; color:transparent`) for the wordmark, scene titles, KPI numerals.
2. **Metal nodes** — a circle filled with `--metal`, ~3px padding, an inner dark face
   (`--metal-face`), `--shadow-metal` (bright top-inset + dark undercut + drop). A small accent
   core dot glows inside.
3. **Metal rules / chips** — hairline dividers and chip numerals.

**Glass plates** — frosted titanium: `--glass-fill` + `backdrop-filter:var(--blur-glass)` +
`--glass-border` + `--shadow-glass` (top inset highlight is mandatory — that 1px white line is
what sells "glass"). Radius `--r-lg`. Used for stat chips and side panels.

**The graph motif** — the through-line. Nodes (metal) joined by thin steel edges. States:
- *Ambient* — a low-opacity (~14%) field of steel nodes slowly drifting behind everything.
- *Tangle (risk)* — dense crossing **amber** edges that flicker → "the problem."
- *Pipeline / lineage* — clean ordered chain, **accent** edges that **draw** (stroke-dashoffset)
  with a travelling white pulse → "the solution / the proof." Drawn edges win; tangles lose.

**Color discipline** — one accent hue, period. Blue for energy/truth, amber ONLY for the problem
beat, everything else graphite/steel/metal. No second accent, no purple, no rainbow.

**Type** — Sora (display, 700/800, tight tracking down to `--track-mega`), Manrope (body),
JetBrains Mono (kickers/meta/numerals). Big-screen scale: nothing below 18px on a 1920 stage.

**Layout** — centered, axial, lots of air. A persistent **chrome**: tiny metal diamond + "GRAFO"
mono watermark top-left, a meta line top-right, an accent **progress hairline** along the bottom.

**Motion** (for video / animated builds) — cinematic and sober. Reveals: fade + 16–26px rise on
`--ease-out` over `--dur-reveal`. Scenes cross-fade (`--dur-scene`), never hard-cut except for
deliberate beats. Content does **not** bounce; only *nodes* may use a slight back-ease on entry.
Edges draw; numerals count up; the camera/light always drifts. Hold text 2–4 s before moving on.

**Borders / radii** — hairlines (`--hairline`) over heavy borders. Radii: `--r-sm` rules,
`--r-md`/`--r-lg` plates, `--r-pill` badges. Corners soft, never sharp.

**States** (for any interactive/deck-nav UI) — hover lifts opacity / adds accent glow; press
shrinks ~2%. Keep it subtle; this is presentation furniture, not an app.

---

## ICONOGRAPHY

This system is **near icon-free by design** — meaning is carried by the **graph** (nodes + edges),
by **metal/glass geometry**, and by **typography**, not by an icon set.

- The only recurring glyph is the **metal diamond** (a 45°-rotated square filled with `--metal`) —
  the Grafo mark. Reuse it as bullet, watermark, and loader.
- Status uses **text badges**, not icons: a `vigente` pill (accent), a `derogada` label
  (steel-dim, struck through in `--risk-hot`).
- If functional icons are genuinely needed (deck controls, arrows), use a **thin-stroke** set
  (e.g. Lucide via CDN, 1.5px) tinted `--text-steel`. Never use emoji. Never hand-draw complex SVG.
- Arrows in copy are real glyphs (`→`) tinted accent, not icon images.

---

## How to use (quick start)

```html
<link rel="stylesheet" href="styles.css">
<div style="background:var(--surface-page); color:var(--text-hi); font-family:var(--font-body)">…</div>
```

Copy a file from `slides/` as your starting frame, or compose the `components/presentation/`
primitives. For motion pieces, reuse the timeline approach from `Grafo.scenes.jsx`
(metal nodes + drawing edges + counting numerals on a 62s arc).
