# Titaniumorphism Skill

> Sistema de design propio creado por **Daniel Carreon** ([@danielcarreon](https://saasfactory.so)) para los videos de SaaS Factory.
> Premium hardware feel + glassmorphic + bezel/screen doble capa hundido. Mostaza pura `#ff9101` + titanium black brushed.

Este skill genera 3 manifestaciones bajo un solo paraguas:

1. **Cards V5 Bezel** — Imagenes PNG via Nano Banana 2 (datos discretos, comparativas premium)
2. **Sketchnote Dark** — Imagenes PNG via Nano Banana 2 (narrativas, conceptos abstractos)
3. **HTML Deck** — CSS render de presentaciones completas (manifestos, decks de video)

---

## Como instalar (Claude Code / cualquier IA agentica)

### Opcion A: Skill nativa de Claude Code

Si usas Claude Code (Anthropic), copia el folder completo a tu directorio de skills:

```bash
# En tu repo, dentro del directorio .claude/skills/
cp -r titaniumorphism-skill .claude/skills/youtube-visuals
```

Luego invoca con cualquier trigger: "estilo titaniumorphism", "deck premium hardware", "sketchnote dark", etc.

### Opcion B: Cualquier otra IA (DeepSeek, GPT, Gemini, etc.)

Pegale a tu IA este mensaje:

```
Voy a darte un sistema de design completo llamado "Titaniumorphism".
Lo creo Daniel Carreon (SaaS Factory). Quiero que lo apliques cuando
te pida imagenes o presentaciones para mis videos.

Aqui esta el SKILL.md y los references. Leelos antes de generar nada.

[pegar contenido de SKILL.md]
[pegar references/ uno por uno]

Cuando te pida un deck o imagen en este estilo, sigue las reglas
exactas del skill: paleta, tipografias, anti-patrones, decision tree
Cards vs Sketchnote vs HTML interno.
```

### Opcion C: Solo el HTML deck (mas simple)

Si solo quieres usar el deck HTML (sin imagenes Nano Banana):
- Lee `references/deck-style-saas-factory.md`
- Copia el template y los tokens CSS
- Reemplaza el contenido con tu narrativa

---

## Estructura

```
titaniumorphism-skill/
├── README.md (este archivo)
├── SKILL.md (orquestador principal — leelo primero)
├── references/
│   ├── style-titaniumorphism.md (umbrella spec — paleta, filosofia, prompt V5)
│   ├── style-sketchnote-dark.md (sub-spec narrativa hand-drawn)
│   ├── deck-style-saas-factory.md (sub-spec HTML deck completo)
│   ├── style-liquid-metal.md (LEGACY — solo si pides explicitamente)
│   └── voice-daniel.md (voz de Daniel para teleprompters/scripts)
└── design-system/ (implementacion en codigo — variante cool graphite + acento azul)
    ├── DESIGN-SYSTEM.md (spec completa de la variante Grafo)
    ├── styles.css (entry point — @import de los tokens)
    ├── tokens/ (colors.css, typography.css, effects.css)
    ├── components/presentation/ (React: MetalHeading, Kicker, GlassChip, KPIStat, MetalNode + .d.ts + .prompt.md)
    ├── guidelines/ (specimen cards HTML — paleta, metal, glass, tipografia)
    └── slides/ (templates 16:9 — Title, Stat, Lineage, Closing)
```

### Sobre `design-system/` (nuevo)

Es la **capa de implementacion en codigo** del estilo titaniumorphism, extraida del video
*Grafo*. A diferencia de las specs en prose de `references/`, aqui hay tokens CSS y componentes
React listos para usar en el proyecto (Next.js 16 + React 19).

> **Nota de variante:** esta capa usa la paleta **cool graphite + un solo acento azul**
> (`--accent: #5fa8e6`, amber `--risk` solo para "el problema"), con tipografias
> **Sora / Manrope / JetBrains Mono**. Es una variante distinta a la "hardware mostaza
> `#ff9101` + Cormorant" de `style-titaniumorphism.md`. Usa una u otra segun el tono que pidas;
> no las mezcles (regla de un solo acento).

No se incluyo el video Grafo en si (`Grafo*.html`, `Grafo.scenes.jsx`, scaffolding del visor),
solo el sistema de diseño reutilizable.

---

## Que NO incluye

- Logos especificos de SaaS Factory (necesitas tus propios assets)
- Foto de Daniel para personajes (usa tu propia foto / avatar)
- Workflow deck-production.md (incluye paths privados)
- Integracion con Mission Control / Supabase / classroom carousel

---

## Filosofia (1 minuto)

**No es minimalismo limpio. Es presencia hardware.**

- Mostaza pura `#ff9101` (NO amarillo cream `#fbbf24`)
- Bezel + screen doble capa hundido (1px outline tenue + 4 box-shadows recipe)
- Titanium black brushed (cuatro tokens `--titanium-top/mid/bot`)
- Cormorant serif para punchlines (NO sans-serif)
- Inter ExtraBold para titulos (NO regular)
- Dot esquina inferior-izquierda como sello (siempre)

**11 anti-patrones criticos** documentados en `references/style-titaniumorphism.md`. Leelos antes de prompt.

---

## Casos de uso validados

- Manifestos de video (deck completo 16 slides)
- Anuncios de producto con datos discretos (Cards)
- Explicaciones de conceptos (Sketchnote Dark)
- Comparativas de modelos IA / harnesses
- Pricing tables (HTML interno)
- Terminales / code blocks (HTML interno con animaciones CSS)

---

## Credito

Creado por **Daniel Carreon** ([SaaS Factory](https://saasfactory.so)) — la unica comunidad hispana construida con su propio codigo.

Si usas el skill, no es obligatorio dar credito, pero si lo haces lo agradezco. Compartelo con quien le pueda servir.

Build in public.
