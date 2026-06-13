---
name: youtube-visuals
description: Genera paquetes visuales narrativos completos para videos de YouTube. Usar cuando Daniel provea un guion, transcript o idea de video y quiera un conjunto de imagenes didacticas (stick figures, fondo blanco) que expliquen la narrativa cronologicamente. Triggers: video visuals, paquete visual, imagenes para video, genera las imagenes, narrativa visual, imagenes del video, genera imagenes para el video, crea las imagenes del video, dibuja la narrativa.
---

# Video Visuals — Generador de Narrativa Visual para YouTube

Genera un paquete completo de imagenes didacticas para videos YouTube en estilo Titaniumorphism.

## Sistema de design: Titaniumorphism (DEFAULT — sistema dual oficial)

**Titaniumorphism** es el sistema unificado de design propio de Daniel (creado 30 Abr 2026, validado en deepseek-v4 manifesto el mismo dia).

UN paraguas, **DOS manifestaciones de imagen** + **HTML deck**, todas compartiendo paleta + reglas:

| Manifestacion | Medium | Spec |
|---------------|--------|------|
| **★ Cards V5 Bezel** (datos discretos) | PNG via Nano Banana 2 | `references/style-titaniumorphism.md` (umbrella + prompt V5) |
| **★ Sketchnote Dark** (conceptos narrativos) | PNG via Nano Banana 2 | `references/style-sketchnote-dark.md` (sub-spec) |
| **★ HTML Deck** (presentacion completa) | CSS render | `references/deck-style-saas-factory.md` (sub-spec) |

**Umbrella spec (filosofia, paleta, reglas compartidas):** [`references/style-titaniumorphism.md`](references/style-titaniumorphism.md)

> **Sistema dual = DEFAULT.** Daniel valido que un deck completo necesita AMBAS manifestaciones de imagen (Cards + Sketchnote Dark) bajo el mismo paraguas. Usar solo una en un deck largo lo hace aburrido (todo Cards) o desordenado (todo Sketchnote). El balance Cards-Sketchnote es lo que hace el deck respirar.

### Matriz de decision Cards vs Sketchnote Dark vs HTML interno (CRITICA)

| Tipo de slide | Manifestacion | Por que |
|---------------|---------------|---------|
| **Datos discretos puntuales** (77.2%, $25/M, 367k stars, 23.2x) | **Cards V5 Bezel** | Precision, comparacion numerica, scan visual rapido |
| **Comparativas paralelas 3-5 items con logos** | **Cards V5 Bezel** | Estructura grid clara, logos reales reconocibles |
| **Conceptos abstractos** (piramide IP, harness vs modelo, timeline) | **Sketchnote Dark** | Hand-drawn cuenta historia |
| **Antes/Despues, Causa/Efecto** (cost collapse, gap closing) | **Sketchnote Dark** | Flechas organicas + narrativa |
| **Personajes / metaforas** (Daniel señalando, robots) | **Sketchnote Dark** | Hand-drawn permite expresion |
| **Frases emblematicas** (hook, twist, punchline) | **Solo texto Cormorant serif** | Punchline puro sin distraccion |
| ★ **Terminales / code blocks / aliases shell** (NUEVO May 2026) | **HTML interno `.slide-component`** | Auto-generado, instantaneo, animaciones CSS, edit sin regenerar |
| ★ **Pricing tables puras** (numeros sin logos heroes) | **HTML interno `.slide-component`** | Pixel-perfect, tabular numbers, sin riesgos de bugs NB2 |
| ★ **Listas numericas / specs sheets** | **HTML interno `.slide-component`** | Editable post-generacion, no cuesta regen |

**Heuristica de bolsillo (3 opciones):**
> ¿Lo dirias como dato discreto con logos? → **Cards V5 Bezel imagen**.
> ¿Lo dibujarias en pizarron narrativo? → **Sketchnote Dark imagen**.
> ¿Es terminal / code / pricing puro / specs? → **HTML interno `.slide-component`**.

**Por que HTML interno gana en su nicho** (validado 1 May 2026 con slide 08 deepseek-flash-v4):

| Dimension | Imagen Nano Banana | HTML interno |
|---|---|---|
| Tiempo generacion | ~30-60s | Instantaneo |
| Pixel-perfect | Aprox (riesgo bugs NB2) | 100% controlable |
| Editar texto despues | Re-generar (~$0.04) | Edit directo (gratis) |
| Animaciones | Estatica | CSS keyframes (cursor blink, hover, etc) |
| Costo | $0.04 / regen | $0 |
| Riesgo de typos NB2 | Alto en datos numericos / `$` | Cero |

**Componentes HTML reutilizables** disponibles en `youtube/videos/deepseek-flash-v4/index.html`:
- `.slide-component` (wrap base con title + subtitle + grid)
- `.terminal-card` (titanium black brushed con bezel, opcional `.highlight` con glow mostaza)
- `.terminal-header` (3 dots Mac rojo/amarillo/verde + "~ — zsh" titulo)
- `.terminal-body` (background hundido, `$` prompt verde glow, JetBrains Mono comando)
- `.term-cmd .arg` (argumento del comando en mostaza, glow extra si esta en card highlight)
- `.term-cursor` (bloque blink 1.05s)
- `.models-grid` (grid 5 columns para pricing comparison)
- `.model-card` (titanium con dot color por categoria)

### Variantes disponibles

| Variante | Tipo | Cuando usar |
|----------|------|-------------|
| **★ Titaniumorphism Cards** (DEFAULT premium datos) | Imagen Nano Banana 2 | Hero images manifesto, datos discretos, comparativas paralelas |
| **★ Titaniumorphism Sketchnote Dark** (DEFAULT premium narrativa) | Imagen Nano Banana 2 | Conceptos abstractos, antes/despues, personajes, narrativa |
| **★ Titaniumorphism HTML Deck** (DEFAULT decks) | HTML/CSS | Presentaciones completas, decks de video manifesto, pitch decks |
| **Sketchnote Crema** (LEGACY casual) | Imagen Nano Banana 2 | Solo tutoriales casuales / build in public · NO mezclar con titanium |
| **Liquid Metal** (LEGACY) | Imagen Nano Banana 2 | Solo si Daniel pide explicitamente "flowing pesado" — NO recomendado |

### Decision tree

- Si Daniel pide DECK HTML completo (presentacion entera) → **HTML Deck Titaniumorphism**
  - Aplicar workflow "Bucle agentico modo BLUEPRINT" (workflow propio) por fases
  - Template listo: `youtube/_playbooks/deck-template-saas-factory.html`
  - Reescribir narrativa con voz Daniel real (ver `references/voice-daniel.md`)
- Si Daniel pide IMAGEN para slide del deck:
  - Si es **dato discreto / comparativa numerica** → **Cards V5 Bezel**
  - Si es **concepto / narrativa / personaje** → **Sketchnote Dark**
- Si Daniel pide IMAGEN para tutorial casual → **Sketchnote Crema** (legacy, fondo `#F5F0E8`)
- Si Daniel pide explicitamente "liquid metal flowing pesado" → **Liquid Metal legacy**

### Triggers explicitos

**Titaniumorphism Cards (datos):**
- "estilo titaniumorphism", "titanium con bezel", "titaniumorphism bezel"
- "imagen premium con datos", "comparativa premium"
- "estilo SaaS Factory premium hardware"
- "imagen tipo reloj digital de lujo", "premium hardware feel"

**Titaniumorphism Sketchnote Dark (narrativa):**
- "estilo sketchnote dark", "sketchnote titanium", "hand-drawn premium"
- "estilo piramide IP", "estilo del manifesto deepseek"
- "imagen narrativa con personaje", "concepto hand-drawn dark"
- "agrega contorno blanco grueso al personaje"

**Titaniumorphism HTML Deck (decks completos):**
- "deck profesional", "presentation HTML", "manifesto deck"
- "estilo SaaS Factory deck", "estilo titanium HTML"
- "deck para video manifesto", "deck para acompañar grabacion"

### Workflow oficial para producir decks complejos

**Aplicar el [Bucle Agentico modo BLUEPRINT](../../prompts/bucle-agentico-blueprint.md)** cuando:
- Daniel pide rebuild de un deck completo
- Hay que coordinar imagenes + HTML + script teleprompter
- Multi-fase con dependencias

Las 5 fases tipicas para producir un manifesto completo:
1. **Setup + skill docs:** corregir paths, descargar logos faltantes, documentar matriz
2. **Generar imagenes:** mapear logos por slide, generar en paralelo grupos sin Daniel + secuencial con Daniel, validar visualmente
3. **HTML deck:** wrap en `.stage` 16:9, tipografia Inter ExtraBold + Cormorant punchlines, 16 slides
4. **Script teleprompter:** voz Daniel verificada, CTA 4 beats sin precio, cheat sheet cifras
5. **Deploy:** copy a `<TU_DEPLOY_PATH>/manifesto/`, commit + push, verify Vercel

### Roadmap de unificacion (futuro, NO ahora)

Aplicar Titaniumorphism al diseño de SaaS Factory Community (saas-factory-community/) para que el sistema del producto matchee con el sistema de marca personal. decidiras cuando arrancar esta migracion.

## Sketchnote (variante default, abajo)

Estilo: infografias dibujadas a mano con doodles rellenos de color, trazos de marcador grueso, flechas organicas, iconos expresivos y muchas etiquetas sobre fondo crema calido.

## IDIOMA — REGLA #1, NO NEGOCIABLE

**TODO el texto visible en las imagenes DEBE ser en ESPANOL.** El publico es hispanohablante.
**El prompt COMPLETO se escribe en ESPANOL.** Nano Banana 2 (Gemini) entiende espanol perfectamente. NUNCA escribir el prompt en ingles.

| En vez de... | Usar... |
|-------------|---------|
| BEFORE / AFTER | ANTES / DESPUES |
| TWO TYPES | DOS TIPOS |
| WITHOUT / WITH | SIN / CON |
| SKILL CREATOR | CREADOR DE SKILLS |
| TEST AND IMPROVE | PROBAR Y MEJORAR |
| TODAY / FUTURE | HOY / FUTURO |

## Estilo Visual — Sketchnote Hand-Drawn

| Regla | Valor |
|-------|-------|
| **Fondo** | Crema calido (#F5F0E8), como papel antiguo o pizarron blanco usado. |
| **Dibujos** | Doodles hand-drawn con relleno de color. Personajes con cuerpo (no solo stick figures). Iconos expresivos rellenos. |
| **Trazos** | Negro grueso estilo marcador. Ligeramente irregulares (organicos, no perfectos). |
| **Contornos** | Los colores de marca FUERTES (#8C27F1, #f69f02, etc.) se usan SOLO para contornos, bordes y trazos. |
| **Rellenos** | Los rellenos son versiones SUAVES/PASTEL del color, estilo lapiz de color o marcatextos. Textura irregular, no solido plano. Con sombreado manual visible (trazos de lapiz visibles). |
| **Texto** | Muchas etiquetas cortas EN ESPANOL. Titulos grandes estilo hand-lettering. Subtitulos en fuente manuscrita. |
| **Densidad** | Rica en elementos: 8-15 elementos etiquetados por imagen. Flechas, iconos, recuadros, personajes, todo con su etiqueta. |
| **Aspect ratio** | 16:9 siempre (formato YouTube). |
| **Anti-patron** | NUNCA fotorrealista. NUNCA fondos oscuros. NUNCA limpio/corporativo. NUNCA minimalista vacio. |

### Elementos Estructurales — Estilo Sketchnote

- **Recuadros redondeados con relleno de color** para agrupar conceptos
- **Hand-lettering grande** para titulos principales (como escrito con marcador grueso)
- **Flechas organicas dibujadas a mano** (curvas, no rectas) conectando conceptos
- **Iconos rellenos de color**: engranes, focos, checks, X, cerebros, estrellas, cohetes, rayos
- **Personajes doodle** con cuerpo simple, expresiones, y a veces sosteniendo objetos
- **Banners y cintas** para destacar conceptos clave
- **Numeracion en circulos rellenos** para secuencias
- **Subrayados y circulos a mano** para enfasis
- **Divisiones visuales**: lineas onduladas o punteadas para secciones

### Principio de Densidad Narrativa

Cada imagen debe contar una historia completa. Inspirado en infografias de pizarron:
- **Titulo grande** arriba (hand-lettering)
- **Subtitulo** explicando el concepto en una linea
- **Elementos centrales** (el diagrama, flujo, o comparacion principal)
- **Etiquetas en CADA elemento** (nada sin etiquetar)
- **Anotaciones laterales** con flechas apuntando a detalles
- **Iconos decorativos** rellenando espacios vacios (estrellas, rayos, flechas pequeñas)

## Sistema de Colores — Contornos Fuertes, Rellenos Suaves

**Regla fundamental:** Los colores de marca son para CONTORNOS y BORDES. Los rellenos son versiones pastel/suaves del mismo color, con textura de lapiz de color o marcatextos (trazos visibles, no plano).

| Color | Contorno (fuerte) | Relleno (suave, estilo lapiz) | Uso |
|-------|-------------------|-------------------------------|-----|
| **Negro** | #000000 | Sombreado gris suave a lapiz | Trazos base, texto, contornos principales. |
| **Morado** | #8C27F1 | Lila/lavanda suave a lapiz de color | Contorno de recuadros protagonista. Relleno lavanda suave. |
| **Naranja calido (NUEVO standard)** | #ff9101 | Amarillo/durazno suave a marcatextos | Contorno de flechas y banners. Relleno durazno claro. Reemplaza #FFD700 anterior. |
| **Naranja legacy** | #f69f02 | (alias de #ff9101) | Compatible para imagenes anteriores |
| **Rojo** | #E74C3C | Rosa/salmon suave a lapiz de color | Contorno de areas de error. Relleno rosa palido. |
| **Verde** | #2ECC71 | Verde menta suave a lapiz de color | Contorno de checkmarks. Relleno verde agua claro. |
| **Azul** | #3498DB | Celeste suave a lapiz de color | Contorno de recuadros info. Relleno celeste palido. |
| **Crema** | — | #F5F0E8 | Fondo base calido. |

### Tecnica de Relleno
- **NUNCA relleno solido plano.** Siempre con textura de lapiz de color o marcatextos.
- Los trazos del relleno deben ser VISIBLES (como si alguien coloreara a mano).
- El sombreado agrega profundidad: mas intenso en bordes, mas suave en centro.
- Los contornos fuertes contrastan contra los rellenos suaves = efecto educativo profesional.

## Assets Globales — Catalogo de Referencias Visuales


**Ruta base de assets:** `youtube/assets/`

```
youtube/assets/
├── logos/           ← Logos de herramientas (Antigravity, Claude Code, etc.)
├── daniel/          ← Fotos de Daniel para conversion a personaje 2D
└── styles/          ← Ejemplos de estilo visual como referencia
```

### Cuando usar assets

| Situacion | Accion |
|-----------|--------|
| La imagen incluye una herramienta especifica (Claude Code, Antigravity, etc.) | Pasar su logo de `assets/logos/` con `--refs` |
| La imagen necesita representar a Daniel | Pasar foto de `assets/daniel/` con `--refs` + describir como "personaje doodle basado en la referencia" |
| El modelo genera un estilo incorrecto | Pasar ejemplo de `assets/styles/` con `--refs` como guia |
| Asset exclusivo de un video | Va en `proyectos/YYYY-MM-DD-xxx/referencias/`, NO en assets globales |

### Personaje Daniel — Sistema de Avatar 2D

**SIEMPRE usar AMBOS assets juntos como --refs (esto es el DEFAULT, no cambiarlo):**
- `assets/daniel/2d-style-sketchnote.png` (estilo visual)
- `assets/daniel/cuello-tortuga.png` (referencia facial)

En el prompt describir: `"personaje Daniel como la referencia 2D (pelo castaño, barba ligera, cuello tortuga negro)"`

NO usar otros assets de Daniel (`2d-bust.png`, `2d-style-tinta-acuarela.png`). Solo el default produce resultados consistentes.

#### Assets de Daniel

| Asset | Archivo | Uso |
|-------|---------|-----|
| **Default (UNICO)** | `2d-style-sketchnote.png` + `cuello-tortuga.png` | SIEMPRE usar ambos juntos como --refs |

Los otros assets (`2d-bust.png`, `2d-style-tinta-acuarela.png`) NO producen resultados consistentes. No usarlos.

#### Rasgos Fisicos de Daniel (para prompts)

```
Joven mexicano, ascendencia española (90%) con mestizaje azteca sutil (10%).
Pelo CASTAÑO CAFE OSCURO (NO negro azabache), corto con volumen, peinado de lado.
Barba: cerrada densa cubriendo mandibula y menton conectada al bigote (look actual).
       O ligera tipo sombra de pocos dias con perilla (look anterior en foto).
Ojos cafes expresivos. Nariz recta. Piel morena clara olivo calida.
Cuello de tortuga negro.
```

#### Como Incluir a Daniel en Imagenes

**Con avatar pre-generado (Modo 1):**
1. Pasar `2d-style-sketchnote.png` + `cuello-tortuga.png` como `--refs`
2. En el prompt: `"personaje Daniel EXACTAMENTE como la ilustracion 2D de referencia (pelo castaño oscuro, barba ligera, cuello tortuga negro)"`
3. Describir EXPRESION FACIAL especifica al contexto (asombro, confianza, confusion, curiosidad, sabiduria picara)
4. Indicar POSICION y DIRECCION de la mano si señala algo

**Con generacion dinamica (Modo 2):**
1. Pasar solo `cuello-tortuga.png` como `--refs`
2. Describir rasgos completos en el prompt usando la referencia de arriba
3. Describir estilo deseado (sketchnote con lapiz de color, tinta+acuarela, etc.)

#### Expresiones Faciales por Contexto

| Contexto | Expresion | Descripcion en prompt |
|----------|-----------|----------------------|
| Presentando algo asombroso | Asombro | "ojos bien abiertos, cejas levantadas, boca abierta de sorpresa positiva" |
| Explicando un framework | Confianza | "sonrisa amplia segura, menton arriba, ojos entrecerrados de seguridad" |
| Comparacion SIN/CON | Confusion → Dominio | Izq: "cejas fruncidas, boca torcida, signos de interrogacion" / Der: "sonrisa confiada, pulgar arriba" |
| Recomendando una opcion | Sabiduria picara | "media sonrisa, ceja levantada, como diciendo ya sabes cual elegir" |
| Teaser/curiosidad | Curiosidad traviesa | "sonrisa de lado, cejas levantadas, ojos brillantes, invitando a descubrir" |

#### Cuando Incluir vs Excluir a Daniel

| Incluir Daniel (SI) | Excluir Daniel (NO) |
|---------------------|---------------------|
| Presentando un concepto central | Diagramas de flujo puros |
| Comparaciones SIN/CON (el es el sujeto) | Listas de features/acciones |
| Recomendando una opcion sobre otra | Timelines o evolucion de sistema |
| Teasers / CTAs al final | Conceptos tecnicos abstractos |

#### Reglas de Posicionamiento

- Daniel va a la IZQUIERDA cuando señala contenido a la DERECHA
- Daniel va a la DERECHA cuando mira/señala contenido a la IZQUIERDA
- MANO DERECHA apunta a la DERECHA, MANO IZQUIERDA apunta a la IZQUIERDA
- NUNCA poner a Daniel en el centro bloqueando el contenido principal

**Regla: NUNCA inventar la cara de tu. Siempre usar assets o foto como referencia.**

## Agentes AI — Levy, Trinity, Sensei

Los 3 agentes AI de SaaS Factory tienen assets en `youtube/assets/agents/`.
Usar como `--refs` cuando una imagen necesite representar a los agentes como personajes.

| Agente | Archivo | Descripcion | Usar cuando... |
|--------|---------|-------------|----------------|
| **Levy** | `agents/levy-sf.png` | Robot AI morado-azul, chip SF en la frente, ojos brillantes | Estrategia, bienvenida, motivacion, ecosistema |
| **Sensei** | `agents/sensei.png` | Agente tecnico/maestro | Arquitectura, codigo, debugging, enseñanza tecnica |
| **Trinity** | `agents/trinity.png` | Agente de soporte | Soporte, navegacion, pagos, onboarding |

### Como Incluir Agentes (V3 — Validado Mar 2026)

**REGLA CRITICA: SIEMPRE pasar los 3 refs de agentes JUNTOS + una imagen de estilo como referencia.**
Cuando se pasa 1 solo ref de agente, el modelo lo ignora y genera un personaje generico.
Los 3 juntos + style ref = agentes consistentes y reconocibles.

```bash
--refs .../assets/agents/levy-sf.png .../assets/agents/sensei.png .../assets/agents/trinity.png .../STYLE_REF.png
```

**STYLE_REF:** Usar una imagen generada previamente donde los agentes salieron bien como referencia.
Imagen de referencia validada: `proyectos/2026-03-23-claude-code-masterclass/generadas-v3/13-5-reglas.png`

En el prompt: `"personaje agente tecnico como la referencia de Sensei"` (sin decir el nombre del agente visible en la imagen).

**NO incluir nombres de agentes en el texto visible de la imagen.** Solo la referencia visual.

### Cuando Incluir Agentes

| Incluir (SI) | Excluir (NO) |
|--------------|--------------|
| Presentando el ecosistema de agentes | Diagramas tecnicos puros |
| Comparando roles (quien hace que) | Listas de features sin contexto |
| Interaccion agente-usuario | Conceptos abstractos sin personajes |

### Posicionamiento (mismas reglas que Daniel)
- Agente a la IZQUIERDA cuando señala contenido a la DERECHA
- Agente a la DERECHA cuando mira/señala contenido a la IZQUIERDA
- NUNCA en el centro bloqueando contenido principal
- Si hay multiples agentes, distribuirlos sin superposicion

## Pipeline Completo

### Paso 1: Analizar el Guion

Lee el script/transcript y extrae **momentos visuales clave** (6-12 maximo).
Guardar en `visual-plan.md`.

### Paso 2: Generar JSON Prompts

**Schema:**

```json
{
  "prompt": "Fondo color crema calido (#F5F0E8). Infografia estilo sketchnote dibujada a mano con marcador grueso. [descripcion detallada en espanol con TODOS los textos/etiquetas que deben aparecer]. Trazos negros gruesos estilo marcador para contornos. CONTORNOS de colores fuertes: morado (#8C27F1), naranja (#f69f02), rojo (#E74C3C), verde (#2ECC71), azul (#3498DB). RELLENOS suaves estilo lapiz de color y marcatextos: lila pastel, durazno claro, rosa palido, verde menta, celeste. Los trazos del relleno a lapiz deben ser visibles, con sombreado manual. Muchas etiquetas manuscritas en espanol. Hand-lettering grande para titulo. Rico en elementos visuales, denso pero organizado. Formato 16:9. NO incluir: fotorrealista, fondo blanco puro, minimalista, corporativo, rellenos solidos planos, colores saturados como relleno, caras detalladas, 3D, digital, vectorial",
  "negative_prompt": "fotorrealista, fondo blanco puro, minimalista, corporativo, rellenos solidos planos, colores saturados como relleno, caras detalladas, 3D, digital, vectorial",
  "refs": [],
  "metadata": {
    "numero": 1,
    "nombre": "nombre-del-momento",
    "concepto": "Que explica esta imagen"
  }
}
```

**Reglas de Prompting V3 (Validado Mar 23, 2026):**

**REGLA #1: PROMPTS CORTOS.** Prompts largos = texto basura en la imagen. Max 4-6 lineas de contenido.
**REGLA #2: PROMPT 100% EN ESPANOL.** CERO palabras en ingles. Ni "LEFT SIDE" ni "RIGHT ZONE".
**REGLA #3: Terminar SIEMPRE con:** `"TODO el texto visible debe ser en ESPANOL. CERO palabras en ingles. Formato 16:9."`

**Patron V3 que funciona (validado con 13 imagenes, 6 top-tier):**

```
"Fondo crema calido (#F5F0E8). Sketchnote a mano. Titulo: '[TITULO EN ESPANOL]'. [Descripcion BREVE del contenido principal, max 3 lineas]. [Personaje si aplica]. [Nota/takeaway abajo]. TODO el texto visible debe ser en ESPANOL. CERO palabras en ingles. Formato 16:9."
```

**Anti-patron (V1/V2, produce basura):**
```
"Fondo color crema calido (#F5F0E8). Infografia estilo sketchnote dibujada a mano con marcador grueso en formato 16:9. Titulo grande arriba estilo hand-lettering: '...'. [200 palabras describiendo cada elemento, cada etiqueta, cada color, cada posicion]..."
```

**Ejemplos reales V3 que produjeron imagenes top-tier:**

Imagen 01 (iceberg, top):
```
"Fondo crema calido (#F5F0E8). Sketchnote a mano. ICEBERG grande al centro. Arriba del agua, pequeño: 'AGENTES' con icono de terminal. Debajo del agua, cuatro capas grandes: 'TOOLS', 'CONFIGURACION', 'PROMPTS', 'CONTEXTO'. Personaje Daniel como la referencia 2D a la izquierda señalando. Texto abajo: 'Anthropic definio los 5 niveles para ser ARQUITECTO'. TODO el texto visible debe ser en ESPANOL. CERO palabras en ingles. Formato 16:9."
```

Imagen 06 (tool overload, top):
```
"Fondo crema calido (#F5F0E8). Sketchnote a mano. Titulo: 'MENOS OPCIONES, MEJORES DECISIONES'. IZQUIERDA rojo: robot confundido con 18 herramientas desordenadas, '18 HERRAMIENTAS = CONFUSION'. DERECHA verde: robot ordenado con 4 tools en mesa: buscar, leer, extraer, guardar. '4 HERRAMIENTAS = PRECISION'. Personaje robot AI como la referencia de Levy abajo. TODO el texto visible debe ser en ESPANOL. CERO palabras en ingles. Formato 16:9."
```

Las reglas anteriores (colores, contornos, rellenos, densidad) siguen aplicando para la EVALUACION de la imagen, pero NO deben inflarse en el prompt. El modelo ya genera bien con instrucciones cortas.

### Paso 3: Generar Imagenes

Usar `--upload` cuando pides ver la imagen en el chat. Si no lo pide, generar solo localmente.

```bash
cd <TU_PROYECTO_CLAUDECLAW>

# Solo local (default)
npx tsx scripts/generate-image.ts \
  --prompt "PROMPT_EN_ESPANOL" \
  --output /ruta/proyecto/generadas/XX-nombre.png \
  --aspect 16:9

# Con upload para mostrar en chat (cuando Daniel lo pida)
npx tsx scripts/generate-image.ts \
  --prompt "PROMPT_EN_ESPANOL" \
  --output /ruta/proyecto/generadas/XX-nombre.png \
  --aspect 16:9 \
  --upload

# Con imagenes de referencia (hasta 10)
npx tsx scripts/generate-image.ts \
  --prompt "PROMPT_EN_ESPANOL" \
  --output /ruta/proyecto/generadas/XX-nombre.png \
  --aspect 16:9 \
  --refs /ruta/proyecto/referencias/logo.png /ruta/otra-ref.png
```

### Paso 4: Validar

1. Verificar que la imagen existe (tamano > 0 bytes)
2. **Verificar que TODO texto visible esta en ESPANOL**
3. Revisar: fondo blanco, recuadros presentes, colores correctos
4. Si el texto NO esta en espanol, regenerar inmediatamente

### Paso 5: Mostrar en Chat (cuando Daniel lo pida)

**Si Daniel pide ver la imagen en el chat**, incluirla como markdown para que se renderice inline en Mission Control:

```markdown
![Descripcion de la imagen](URL_DEL_SCRIPT_OUTPUT)
```

**Como funciona:**
- El script con `--upload` sube a Supabase Storage y devuelve `URL:https://...`
- `MarkdownMessage` en Mission Control renderiza `![alt](url)` como imagen con lightbox
- Daniel puede tocar/click para ampliar (pinch-to-zoom en movil, scroll en desktop)
- Si NO usas `--upload`, Daniel NO vera la imagen en el chat

**Si `--upload` no esta disponible (fallback manual):**
```bash
curl -s -X POST "https://<TU_SUPABASE_PROJECT>.supabase.co/storage/v1/object/media/generated/NOMBRE.png" \
  -H "Authorization: Bearer $TU_SUPABASE_KEY" \
  -H "Content-Type: image/png" \
  --data-binary @/ruta/a/imagen.png
```
URL publica: `https://<TU_SUPABASE_PROJECT>.supabase.co/storage/v1/object/public/media/generated/NOMBRE.png`

## Estructura de Archivos por Proyecto

```
proyectos/YYYY-MM-DD-titulo-del-video/
├── script.md
├── visual-plan.md
├── prompts/
│   ├── 01-nombre.json
│   └── ...
├── generadas/                   ← Imagenes generadas (PNG)
│   ├── 01-nombre.png
│   └── ...
└── referencias/                 ← Logos, estilos, assets reutilizables
    ├── logo.png
    └── ...
```

