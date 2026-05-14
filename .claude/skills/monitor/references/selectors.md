# Selectores DOM por Plataforma — Monitor Skill

> ADVERTENCIA: Los selectores de redes sociales cambian frecuentemente.
> Si un selector falla, tomar screenshot y extraer con visión del LLM como fallback.

---

## Facebook — Post orgánico de página pública

**URL esperada:**
- `https://www.facebook.com/{page}/posts/{post_id}`
- `https://www.facebook.com/permalink.php?story_fbid={id}&id={page_id}`
- `https://www.facebook.com/share/p/{share_id}/`

**Selectores actuales (2025-2026):**
```javascript
const metrics = {
  reactions: [
    '[aria-label*="reaction"]',
    '[data-testid="UFI2ReactionsCount"]',
    'span[role="toolbar"] span',
    'div[id^="u_0_"] span[class*="count"]'
  ],
  comments: [
    '[aria-label*="comment"]',
    'a[href*="?comment_id"]',
    'span[aria-label*="Comment"]'
  ],
  shares: [
    '[aria-label*="share"]',
    '[aria-label*="Share"]'
  ]
}
```

**Fallback — visión LLM:**
Si todos los selectores fallan, tomar screenshot y usar el modelo para extraer:
```
En esta captura de un post de Facebook, extrae los conteos visibles:
- Número de reacciones (likes, loves, etc.)
- Número de comentarios
- Número de veces compartido
Responde SOLO con JSON: {"reactions": N, "comments": N, "shares": N}
Si no puedes leer un valor, usa null.
```

**Señales de bloqueo (loginwall):**
```javascript
const blocked =
  document.title.includes('Log In') ||
  window.location.href.includes('/login') ||
  !!document.querySelector('[data-testid="royal_login_form"]') ||
  !!document.querySelector('form[action*="login"]')
```

---

## Instagram — Perfil público

> Instagram bloquea agresivamente el scraping. Siempre usar entrada manual.

**URL esperada:**
- `https://www.instagram.com/p/{shortcode}/`
- `https://www.instagram.com/reel/{shortcode}/`

**Estado esperado:** `scrape_status = 'manual'` — no intentar scrape.

**Métricas manuales a solicitar:**
- Likes (corazones)
- Comentarios
- Guardados (si disponible en Insights)
- Alcance (si tienen cuenta de negocio)
- Reproducciones (para Reels)

---

## TikTok — Video público

**URL esperada:**
- `https://www.tiktok.com/@{user}/video/{id}`

**Selectores:**
```javascript
({
  likes:    document.querySelector('[data-e2e="like-count"]')?.textContent?.trim(),
  comments: document.querySelector('[data-e2e="comment-count"]')?.textContent?.trim(),
  shares:   document.querySelector('[data-e2e="share-count"]')?.textContent?.trim(),
  views:    document.querySelector('[data-e2e="video-views"]')?.textContent?.trim() ||
            document.querySelector('strong[data-e2e="video-views"]')?.textContent?.trim()
})
```

**Parsear valores con K/M:**
```javascript
function parseCount(text) {
  if (!text) return 0;
  text = text.replace(',', '').trim();
  if (text.endsWith('M')) return parseFloat(text) * 1000000;
  if (text.endsWith('K')) return parseFloat(text) * 1000;
  return parseInt(text) || 0;
}
```

---

## YouTube — Video público

**URL esperada:**
- `https://www.youtube.com/watch?v={id}`
- `https://youtu.be/{id}`

**Open Graph (más estable que DOM):**
```javascript
({
  title:  document.querySelector('meta[property="og:title"]')?.content,
  views:  document.querySelector('meta[itemprop="interactionCount"]')?.content
})
```

**DOM (menos estable):**
```javascript
({
  views:  document.querySelector('yt-formatted-string.view-count')?.textContent,
  likes:  document.querySelector('#top-level-buttons-computed ytd-toggle-button-renderer:first-child')?.textContent
})
```

---

## Algoritmo de extracción robusto

```
PARA CADA URL:

1. Detectar plataforma desde el dominio del URL
   - facebook.com → Facebook scraper
   - instagram.com → Manual (skip scrape)
   - tiktok.com → TikTok scraper
   - youtube.com / youtu.be → YouTube scraper

2. Navegar a la URL (esperar 2s para JS)

3. Verificar si hay loginwall
   → SI: status = 'blocked', pedir manual

4. Intentar selectores DOM en orden
   → Primer selector que retorna valor: usar
   → Todos fallan: tomar screenshot, usar LLM visión

5. Parsear valores (manejar K/M/B)

6. Calcular engagement_score según fórmula de plataforma

7. Guardar en content_outcomes
   → status = 'success' si se obtuvo al menos 1 métrica
   → status = 'failed' si todo falló
```

---

## Tasas de éxito esperadas (estimado)

| Plataforma | Tipo | Éxito esperado | Notas |
|------------|------|----------------|-------|
| Facebook | Páginas públicas | ~60% | Varía con CDN y ubicación |
| Facebook | Posts privados/grupos | 0% | Requiere auth |
| Instagram | Cualquier | ~5% | Solo entrada manual |
| TikTok | Videos públicos | ~70% | Selectores más estables |
| YouTube | Videos públicos | ~80% | OG tags son estables |

**Estrategia realista:**
- Priorizar Facebook (audiencia principal de CancioBot)
- Aceptar que Instagram siempre será manual
- Si el scrape falla 3 veces consecutivas, marcar como `blocked` permanente
