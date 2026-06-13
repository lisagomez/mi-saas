# Sketchnote Dark Titanium — Sub-spec del paraguas Titaniumorphism

> Sistema **fusionado**: hand-drawn sketchnote + paleta titanium dark.
> Inventado el 30 Abr 2026 después de validar variantes en deepseek-v4.
> Vive bajo el paraguas Titaniumorphism (paleta + reglas duras compartidas).

---

## Por qué existe (vs sketchnote crema clásico)

El sketchnote V3 con fondo crema (`#F5F0E8`) **DESENTONA** del sistema Titaniumorphism cuando se mezclan en un mismo deck. La fricción visual rompe la sensación de marca unificada.

**Solución:** mismo lenguaje hand-drawn, pero sobre fondo titanium negro `#09090b` con paleta de marca.

| Aspecto | Sketchnote crema (legacy) | Sketchnote dark (nuevo) |
|---------|--------------------------|------------------------|
| Fondo | `#F5F0E8` crema cálido | `#09090b` titanium negro |
| Trazos | Negros gruesos marker | Blancos gruesos marker |
| Rellenos | Pastel suave sobre crema | Pastel con brillos metálicos sobre dark |
| Acentos | Morado fuerte + naranja | Mostaza `#ff9101` + morado `#683ACC` |
| Contexto | Tutoriales casuales, build in public, lecciones | Decks premium, manifestos, brand-forward |

---

## Cuándo usar (matriz dentro del paraguas Titaniumorphism)

| Tipo de slide | Estilo | Por qué |
|---------------|--------|---------|
| **Datos discretos puntuales** (77.2%, $25/M, 367k stars, 23.2x) | **Titaniumorphism Cards** | Precisión, comparación numérica, scan visual rápido |
| **Comparativas paralelas 3-5 items** (3 promesas, 4 stats Anthropic, 5 modelos pricing) | **Titaniumorphism Cards** | Estructura grid clara |
| **Conceptos abstractos** (pirámide IP, harness vs modelo, timeline 2024→2027) | **Sketchnote Dark** | Hand-drawn cuenta historia |
| **Antes/Después · Causa/Efecto** (cost collapse $100M→$0, Stanford 30%→2.7%) | **Sketchnote Dark** | Flechas orgánicas + narrativa |
| **Personajes / metáforas** (Daniel señalando, robot confundido, cerebros) | **Sketchnote Dark** | Hand-drawn permite expresión |
| **Frases emblemáticas** (hook, twist, "las decisiones") | **Solo texto** Cormorant serif | Punchline puro |

**Heurística de bolsillo:**
> ¿Lo dirías como dato o lo dibujarías en pizarrón?
> Dato → **Titanium Cards**. Dibujo → **Sketchnote Dark**.

---

## Estilo Visual — Sketchnote Dark Titanium

| Regla | Valor |
|-------|-------|
| **Fondo** | Titanium negro `#09090b` con textura brushed metal sutil horizontal |
| **Trazos** | Blancos gruesos estilo marker. Ligeramente irregulares (orgánicos, no perfectos). |
| **Rellenos** | Pastel suave estilo lápiz de color con **brillos metálicos sutiles**. NO solid plano. |
| **Acentos color** | Mostaza `#ff9101` (protagonista/oferta) + morado `#683ACC` (concepto/secundario) |
| **Texto** | Hand-lettering blanco grande. Subtítulos serif italica gris claro. |
| **Densidad** | 6-12 elementos etiquetados por imagen (menos que crema, más respiración) |
| **Aspect ratio** | 16:9 siempre |
| **Anti-patrón** | NUNCA fondo crema. NUNCA trazos negros sobre dark. NUNCA neon. NUNCA flat. |

### Elementos estructurales

- **Mini-cards titanium** (bezel + screen) integrados dentro del sketchnote para datos puntuales
- **Hand-lettering blanco grande** para títulos arriba
- **Flechas orgánicas blancas** dibujadas a mano conectando conceptos
- **Iconos hand-drawn rellenos** con paleta mostaza/morado
- **Personajes doodle** integrados (Daniel 2D, robots, cerebros) con cuello tortuga negro etc
- **Numeración en círculos rellenos mostaza** para secuencias
- **Halos sutiles mostaza** alrededor del concepto protagonista
- **Dot esquina circular mostaza** sello de marca (heredado de Titaniumorphism)

### Densidad narrativa

Cada imagen cuenta UNA historia completa:
- **Título grande** arriba (hand-lettering blanco)
- **Subtítulo** explicando concepto en una línea (serif italic gris)
- **Elementos centrales** (diagrama, flujo, comparación)
- **Etiquetas en cada elemento** (nada sin etiquetar)
- **Anotaciones laterales** con flechas a detalles
- **Iconos decorativos** rellenando espacios vacíos

---

## Prompt canónico V1 (validado 30 Abr 2026 con pirámide IP Variante A)

**Patrón ganador:**

```
Fondo titanium negro #09090b con textura brushed metal sutil. Estilo sketchnote a mano sobre fondo oscuro: contornos blancos gruesos estilo marker, rellenos pastel suaves estilo lapiz de color con brillos metalicos. Acentos en mostaza brillante #ff9101 y morado #683ACC.

Titulo arriba hand-lettering blanco grande: '[TITULO ESPANOL]'.
Subtitulo gris claro pequeño: '[SUBTITULO BREVE]'.

[DESCRIPCION DEL CONTENIDO PRINCIPAL en 2-3 lineas, con elementos hand-drawn etiquetados].

[Si hay personaje: "Personaje X como la referencia 2D, expresion [contexto], mano [posicion] señalando [destino]"].

Pequeño dot circular brillante mostaza en una esquina como sello.

TODO el texto visible en ESPANOL. CERO palabras en ingles. Formato 16:9.
```

**Reglas duras del prompt (heredadas de V3 sketchnote):**
- PROMPTS CORTOS — máx 6-8 líneas de contenido
- TODO en español, cero inglés
- Cerrar con: `"TODO el texto visible debe ser en ESPANOL. CERO palabras en ingles. Formato 16:9."`
- Negative prompt: `"fotorrealista, fondo crema o blanco, neon, 3D, vectorial digital limpio, anotaciones flotantes pedagogicas"`

---

## Refs (--refs) recomendados

### Cuando hay personaje Daniel:
```bash
--refs \
  youtube/assets/daniel/2d-style-sketchnote.png \
  youtube/assets/daniel/2d-bust.png \
  youtube/videos/deepseek-v4/images/v5-mockups/piramide-A-sketchnote-dark.png  # style ref validado
```

> ⚠️ El asset `cuello-tortuga.png` NO existe en disco aunque estaba documentado. Usar `2d-bust.png` como facial ref + `2d-style-sketchnote.png` como style ref.

### Cuando hay logos (modelos/harnesses/empresas):
```bash
--refs \
  youtube/assets/logos/[categoria]/[logo1].png \
  youtube/assets/logos/[categoria]/[logo2].png \
  youtube/videos/deepseek-v4/images/v5-mockups/piramide-A-sketchnote-dark.png  # style ref
```

**Style ref obligatorio:** `piramide-A-sketchnote-dark.png` (la pirámide IP variante A) — es la referencia validada del estilo. Pasarla SIEMPRE como último ref para mantener consistencia visual del estilo dark.

### Tipografía dentro de la imagen

| Elemento | Estilo |
|----------|--------|
| Título principal | Hand-lettering blanco enorme estilo marker grueso |
| Subtítulo | Serif italica gris claro mediano |
| Etiquetas/labels | Hand-lettering blanco/mostaza pequeño-mediano |
| Numéricos hero | Hand-lettering mostaza enorme con halo |

**NO mezclar** con tipografía digital limpia (Inter, JetBrains). Todo dentro de la imagen es hand-drawn.

---

## Lessons learned (validación 30 Abr 2026)

### Variantes probadas para slide 17 (Pirámide IP)

| Variante | Resultado | Aprendizaje |
|----------|-----------|-------------|
| **A: Sketchnote dark puro** | ★ ELEGIDA | Pirámide hand-drawn limpia, capa mostaza brillante destaca, flechas orgánicas |
| B: Sketchnote dark + Daniel | Rechazada | Daniel ocupó la mitad del frame, pirámide se sintió chica. Estilo personaje no matcheó marker dark |
| C: Sketchnote dark + logos | Rechazada | Logos demasiado pequeños/amontonados, SF gigante mató el balance |

**Conclusión:** los logos en sketchnote dark deben ser **pocos (max 3-4)** y **bien dimensionados (~10-15% canvas cada uno)**. NO tirar 7 logos como decoración.

---

## Anti-patrones documentados

| Anti-patrón | Por qué falla | Fix |
|-------------|---------------|-----|
| **Fondo crema** en sketchnote dark | Desentona del Titaniumorphism | Usar `#09090b` siempre |
| **Trazos negros sobre dark** | Ilegibles | Usar trazos blancos |
| **Rellenos sólidos saturados** | Pierde feel hand-drawn | Pastel suave estilo lápiz de color |
| **Demasiados logos como decoración** | Se ven amontonados | Max 3-4 logos, bien dimensionados |
| **Personaje + diagrama denso** | Compite por atención | Si hay personaje, simplificar diagrama |
| **Anotaciones flotantes pedagógicas** (V4 typos basura) | Nano Banana 2 inventa palabras frankenstein | Sketchnote ya es pedagógico, no agregar pseudo-anotaciones |
| **Neon/synthwave** | Es video juego, no premium | Solo titanium dark |
| **Palabras como "GIGANTE", "BIG", "LEFT", "RIGHT"** en el prompt | Nano Banana 2 las interpreta como texto literal y las dibuja en la imagen | Reformular: "tamaño grande", "izquierdo", "derecho" en español sin keywords ambiguos |
| **Personaje Daniel sale 3D/realista** | Default del modelo cuando solo das `2d-bust.png` | Especificar **ESTRICTAMENTE 2D HAND-DRAWN estilo LAPIZ DE COLOR** + agregar **contorno blanco grueso marker** sobre fondo dark + ref obligatorio `2d-style-sketchnote.png` |
| **Asset `cuello-tortuga.png` referenciado pero no existe** | Bug en doc previa de la skill | Usar `2d-bust.png` (busto frontal) + `2d-style-sketchnote.png` (style ref) juntos |
| **Mismo deck con solo Cards** | Aburre, monótono | Mezclar SIEMPRE con Sketchnote Dark según matriz (datos = Cards, narrativa = Sketchnote) |

---

## Validación post-generación

1. **Tipografía**: TODO español, sin palabras inglés inventadas
2. **Fondo**: titanium negro `#09090b`, no crema
3. **Trazos**: blancos gruesos marker (no negros, no líneas finas)
4. **Acentos**: mostaza `#ff9101` + morado `#683ACC` (no #FFD700, no neon)
5. **Logos**: bien dimensionados (~10-15% canvas), max 4
6. **Densidad**: 6-12 elementos etiquetados (no más, no menos)
7. **Halo mostaza**: presente en el elemento protagonista
8. **Dot esquina**: circular mostaza como sello de marca

---

## Referencias visuales validadas

```
youtube/videos/deepseek-v4/images/v5-mockups/
└── piramide-A-sketchnote-dark.png  ← ★ STYLE REF OFICIAL
```

**Triggers Daniel para invocar este sub-estilo:**
- "estilo sketchnote dark"
- "sketchnote titanium"
- "hand-drawn premium"
- "estilo pirámide IP"
- "estilo del manifesto deepseek"

---

*Sistema validado el 30 Abr 2026 con video deepseek-v4. La fusión sketchnote + titanium funciona porque conserva el lenguaje narrativo del hand-drawn pero respeta el sistema de marca unificado Titaniumorphism.*
