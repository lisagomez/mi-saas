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
  // --- Banda ---
  {
    regions: ['sinaloa', 'culiacán', 'culiacan', 'mazatlán', 'mazatlan', 'los mochis', 'guasave', 'sonora', 'hermosillo', 'navojoa'],
    styles: ['banda', 'grupero', 'sinaloense'],
    directives: 'banda sinaloense, tuba prominente, clarinete, tambora, tempo 130-145 BPM, feel de fiesta norteña',
  },
  {
    regions: ['jalisco', 'guadalajara', 'zapopan', 'colima', 'nayarit', 'tepic', 'michoacán', 'michoacan', 'morelia'],
    styles: ['banda', 'grupero'],
    directives: 'banda jalisciense, metales brillantes, trombón, tambora jaliscience, tempo 125-135 BPM',
  },
  // --- Mariachi ---
  {
    regions: ['jalisco', 'guadalajara', 'zapopan', 'michoacán', 'michoacan', 'morelia', 'guanajuato', 'cdmx', 'ciudad de méxico', 'ciudad de mexico'],
    styles: ['mariachi', 'ranchera', 'ranchero', 'corrido'],
    directives: 'mariachi tradicional mexicano, trompetas brillantes, guitarrón, vihuela, guitarra de golpe, compás 3/4 o 2/4, emotivo y romántico',
  },
  // --- Norteño ---
  {
    regions: ['nuevo león', 'nuevo leon', 'monterrey', 'tamaulipas', 'coahuila', 'chihuahua', 'durango', 'zacatecas'],
    styles: ['norteño', 'norteno', 'corrido', 'grupero', 'banda'],
    directives: 'norteño regiomontano, bajo sexto, acordeón diatónico, polka rhythm, tempo 110-130 BPM, estilo fronterizo',
  },
  // --- Corrido Tumbado / Regional Mexicano moderno ---
  {
    regions: [],  // nacional / sin región específica
    styles: ['corrido tumbado', 'corridos tumbados', 'regional mexicano', 'sierreño', 'sierreno'],
    directives: 'corrido tumbado moderno, guitarras eléctricas con distorsión leve, bajo profundo, acordeón, trap 808 sutil, tempo 75-85 BPM, mood oscuro y épico',
  },
  // --- Pop / Balada ---
  {
    regions: [],
    styles: ['pop', 'balada', 'pop balada', 'romántico', 'romantico', 'romántica', 'romantica'],
    directives: 'pop balada en español, piano emocional, cuerdas suaves, producción limpia, tempo 70-90 BPM, emotivo y cinematográfico',
  },
  // --- Reggaeton / Urbano ---
  {
    regions: [],
    styles: ['reggaeton', 'urbano', 'trap', 'perreo'],
    directives: 'reggaeton moderno, dembow beat, sintetizadores, 808 bass, hi-hats en loop, tempo 90-95 BPM',
  },
  // --- Cumbia ---
  {
    regions: ['veracruz', 'tabasco', 'villahermosa', 'coatzacoalcos', 'campeche', 'yucatán', 'yucatan', 'mérida', 'merida'],
    styles: ['cumbia', 'tropical', 'salsa'],
    directives: 'cumbia tropical mexicana, marimba, percusiones latinas, bajo eléctrico, tempo 110-120 BPM, festivo y bailable',
  },
  // --- Cumbia nacional ---
  {
    regions: [],
    styles: ['cumbia', 'tropical'],
    directives: 'cumbia pop, acordeón, percusiones, bajo eléctrico, tempo 110-120 BPM',
  },
  // --- Rock / Alternativo ---
  {
    regions: [],
    styles: ['rock', 'alternativo', 'rock alternativo', 'metal', 'punk'],
    directives: 'rock en español, guitarras eléctricas, batería en vivo, bajo, tempo 120-160 BPM según intensidad',
  },
]

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
