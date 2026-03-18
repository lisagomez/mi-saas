/**
 * Construye el prompt visual para Replicate basado en el estilo musical y la letra.
 * El objetivo es que transiciones, colores y atmósfera sean coherentes con la canción
 * — no un slideshow genérico.
 */

interface VideoStyleConfig {
  /** Descripción visual del ambiente (colores, iluminación, estética) */
  mood: string
  /** Tipo de transición entre fotos */
  transition: 'fade' | 'slide' | 'zoom' | 'dissolve' | 'flash'
  /** Duración de cada foto en segundos */
  photoDuration: number
  /** FPS del video */
  fps: number
  /** Color overlay / filtro de color (hex o null) */
  colorFilter: string | null
}

const STYLE_MAP: Record<string, VideoStyleConfig> = {
  banda: {
    mood: 'warm earthy tones, golden hour, rural Mexico landscape, nostalgic and emotional, sepia-inspired color grade',
    transition: 'dissolve',
    photoDuration: 3.5,
    fps: 24,
    colorFilter: '#C8A96E',
  },
  norteño: {
    mood: 'warm earthy tones, golden hour, rural Mexico landscape, nostalgic and emotional, sepia-inspired color grade',
    transition: 'dissolve',
    photoDuration: 3.5,
    fps: 24,
    colorFilter: '#C8A96E',
  },
  corrido: {
    mood: 'cinematic dark moody, deep shadows, dramatic contrast, bold and powerful, film noir inspired',
    transition: 'flash',
    photoDuration: 2.5,
    fps: 30,
    colorFilter: '#1A1A2E',
  },
  'corrido tumbado': {
    mood: 'dark cinematic, moody urban atmosphere, neon accents, high contrast, dramatic and intense',
    transition: 'flash',
    photoDuration: 2,
    fps: 30,
    colorFilter: '#0D0D1A',
  },
  pop: {
    mood: 'bright soft pastels, bokeh lights, warm golden hour, dreamy romantic atmosphere, vibrant and joyful',
    transition: 'fade',
    photoDuration: 3,
    fps: 24,
    colorFilter: '#FFD6E0',
  },
  romántica: {
    mood: 'soft warm light, rose and gold tones, intimate and tender, bokeh background, cinematic romance',
    transition: 'dissolve',
    photoDuration: 4,
    fps: 24,
    colorFilter: '#FFB6C1',
  },
  cumbia: {
    mood: 'bright tropical colors, festive and energetic, vibrant saturated palette, celebration atmosphere',
    transition: 'slide',
    photoDuration: 2.5,
    fps: 30,
    colorFilter: '#FF6B35',
  },
  reggaeton: {
    mood: 'urban vibrant neon, high energy, bold colors, street aesthetic, dynamic and modern',
    transition: 'flash',
    photoDuration: 2,
    fps: 30,
    colorFilter: '#7B2FBE',
  },
  balada: {
    mood: 'soft emotional lighting, muted warm tones, heartfelt and sincere, cinematic slow motion feel',
    transition: 'dissolve',
    photoDuration: 4,
    fps: 24,
    colorFilter: '#E8D5B7',
  },
  ranchera: {
    mood: 'traditional Mexican warmth, earthy terracotta palette, heartfelt rural atmosphere, nostalgic sepia warmth',
    transition: 'dissolve',
    photoDuration: 3.5,
    fps: 24,
    colorFilter: '#C17F24',
  },
  mariachi: {
    mood: 'festive and proud, warm golden tones, celebration, traditional Mexican heritage, joyful and energetic',
    transition: 'slide',
    photoDuration: 2.5,
    fps: 24,
    colorFilter: '#D4AF37',
  },
}

const DEFAULT_STYLE: VideoStyleConfig = {
  mood: 'warm cinematic, emotional atmosphere, soft lighting, heartfelt and personal',
  transition: 'dissolve',
  photoDuration: 3,
  fps: 24,
  colorFilter: null,
}

/**
 * Detecta el tema de la letra usando palabras clave — sin IA, sin costo.
 */
function detectLyricTheme(lyricsText: string): string {
  const lower = lyricsText.toLowerCase()

  if (/cumpleaños|años de vida|feliz cumple/.test(lower))
    return 'birthday celebration, confetti, candles, joyful moments'
  if (/boda|matrimonio|casamiento|novia|novio/.test(lower))
    return 'wedding love story, elegant romantic moments, eternal commitment'
  if (/madre|mamá|mami|gracias por|te debo todo/.test(lower))
    return 'maternal love, family warmth, tender memories, gratitude'
  if (/padre|papá|papi/.test(lower))
    return 'father figure, strength and guidance, family pride, appreciation'
  if (/te amo|mi vida|corazón|siempre juntos/.test(lower))
    return 'romantic love story, couple moments, tender and intimate'
  if (/quinceañera|quince años|xv años/.test(lower))
    return 'quinceañera celebration, princess aesthetic, youthful joy, milestone moment'
  if (/amistad|amigo|compadre|hermano/.test(lower))
    return 'friendship and brotherhood, shared memories, loyalty and camaraderie'
  if (/navidad|año nuevo/.test(lower))
    return 'holiday celebration, festive warmth, family gathering, seasonal joy'
  if (/graduación|graduado|logro/.test(lower))
    return 'academic achievement, proud milestone, future dreams, celebration'

  return 'personal memories, heartfelt moments, celebration of life'
}

/**
 * Normaliza el estilo musical para buscar en el mapa.
 * Maneja variaciones como "BANDA", "banda norteña", etc.
 */
function normalizeStyle(musicalStyle: string): string {
  const lower = musicalStyle.toLowerCase().trim()
  // Buscar la clave más larga que haga match (priorizar "corrido tumbado" sobre "corrido")
  return Object.keys(STYLE_MAP)
    .filter((key) => lower.includes(key))
    .sort((a, b) => b.length - a.length)[0] ?? ''
}

export interface VideoPromptResult {
  stylePrompt: string
  transition: VideoStyleConfig['transition']
  photoDuration: number
  fps: number
  colorFilter: string | null
}

export function buildVideoStylePrompt(params: {
  musicalStyle: string
  lyricsText: string
}): VideoPromptResult {
  const { musicalStyle, lyricsText } = params

  const styleKey = normalizeStyle(musicalStyle)
  const config = styleKey ? STYLE_MAP[styleKey] : DEFAULT_STYLE
  const theme = detectLyricTheme(lyricsText)

  const stylePrompt = [
    config.mood,
    theme,
    'photo slideshow with smooth transitions',
    'high quality cinematic video',
    'synchronized with music',
  ].join(', ')

  return {
    stylePrompt,
    transition: config.transition,
    photoDuration: config.photoDuration,
    fps: config.fps,
    colorFilter: config.colorFilter,
  }
}
