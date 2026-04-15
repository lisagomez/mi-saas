/**
 * Catálogo regional de estilos musicales para CancioBot.
 * Cruza el estilo elegido por el cliente con su origen/residencia
 * para generar directivas musicales precisas para Suno AI.
 */

interface RegionStyleEntry {
  regions: string[]       // keywords que matchean origin/residence (lowercase)
  styles: string[]        // keywords que matchean el estilo elegido (lowercase)
  directives: string      // directivas para Suno AI
}

const CATALOG: RegionStyleEntry[] = [
  // --- Corrido Tumbado / Sierreño / Corrido genérico ---
  // Catch-all para cualquier "corrido X" sin región específica.
  // Debe ir ANTES de norteño para que 'corrido' no sea capturado por ese entry.
  {
    regions: [
      'sonora', 'sinaloa', 'baja california', 'tijuana', 'culiacan', 'culiacán',
      'hermosillo', 'navojoa', 'los mochis', 'guasave',
      'chihuahua', 'durango', 'jalisco', 'nayarit', 'guerrero',
      'michoacan', 'michoacán', 'zacatecas', 'colima',
      'california', 'los angeles', 'arizona', 'nevada', 'chicago',
    ],
    styles: [
      'corrido tumbado', 'corridos tumbados', 'tumbado',
      'sierreño', 'sierreno', 'corrido sierreño', 'corrido sierreno',
      'regional mexicano', 'corrido moderno', 'corrido',
    ],
    directives: 'corrido tumbado moderno, guitarras eléctricas con distorsión leve, bajo profundo, acordeón, trap 808 sutil, tempo 75-85 BPM, mood oscuro y épico',
  },
  // --- Corrido Norteño ---
  // SIN 'corrido' genérico — evita capturar "corrido tumbado" / "corrido sierreño"
  {
    regions: [
      'chihuahua', 'coahuila', 'tamaulipas', 'nuevo leon', 'nuevo león',
      'monterrey', 'durango', 'zacatecas',
      'texas', 'el paso', 'laredo', 'san antonio', 'houston',
    ],
    styles: ['corrido norteño', 'corrido norteno', 'norteño', 'norteno', 'regional norteño', 'conjunto norteño'],
    directives: 'corrido norteño, bajo sexto, acordeón diatónico, batería norteña, tempo 110-130 BPM, estilo fronterizo y emotivo',
  },
  // --- Banda Sinaloense ---
  {
    regions: [
      'sinaloa', 'culiacan', 'culiacán', 'mazatlan', 'mazatlán', 'los mochis',
      'sonora', 'hermosillo', 'nayarit', 'colima', 'jalisco',
    ],
    styles: ['banda', 'sinaloense', 'grupero'],
    directives: 'banda sinaloense, tuba prominente, clarinete, trombones, tambora, tempo 125-145 BPM, feel de fiesta norteña',
  },
]

/** Mapeo de artistas conocidos a estilos del catálogo */
const ARTIST_TO_STYLE: Array<{ keywords: string[]; style: string }> = [
  { keywords: ['beto quintanilla', 'quintanilla'], style: 'corrido sierreño' },
  { keywords: ['peso pluma', 'natanael cano', 'junior h', 'ivan cornejo', 'eslabón armado'], style: 'corrido tumbado' },
  { keywords: ['banda ms', 'banda sinaloense', 'el recodo', 'la adictiva', 'la original banda el limón', 'carin leon', 'carín león', 'eden munoz', 'edén muñoz'], style: 'banda' },
  { keywords: ['calibre 50', 'los tucanes', 'los yonics', 'lupillo rivera', 'joan sebastian', 'vicente fernandez', 'vicente fernández'], style: 'corrido norteño' },
  { keywords: ['los dos carnales', 'gabito ballesteros', 'el fantasma'], style: 'corrido sierreño' },
]

/**
 * Si el texto menciona un artista conocido, devuelve el estilo correspondiente.
 * De lo contrario, devuelve el texto original.
 */
export function resolveArtistStyle(input: string): string {
  const lower = input.toLowerCase()
  for (const entry of ARTIST_TO_STYLE) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return entry.style
    }
  }
  return input
}

/** Fallback cuando no hay match en el catálogo */
function fallbackDirectives(style: string): string {
  return `estilo ${style}, producción profesional en español, emotivo y bien producido`
}

/**
 * Genera las directivas musicales para Suno AI combinando
 * el estilo elegido por el cliente con su origen/residencia.
 */
export function buildMusicPrompt(
  style: string,
  origin: string | null,
  residence: string | null
): string {
  const styleLow = style.toLowerCase()
  const locationLow = [origin, residence]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  // Buscar el match más específico (región + estilo)
  const regionStyleMatch = CATALOG.find(entry =>
    entry.regions.length > 0 &&
    entry.regions.some(r => locationLow.includes(r)) &&
    entry.styles.some(s => styleLow.includes(s))
  )
  if (regionStyleMatch) return regionStyleMatch.directives

  // Solo estilo (sin región)
  const styleOnlyMatch = CATALOG.find(entry =>
    entry.styles.some(s => styleLow.includes(s))
  )
  if (styleOnlyMatch) return styleOnlyMatch.directives

  return fallbackDirectives(style)
}
