/** Tipos de la API no oficial de Suno AI */

export interface SunoGenerateParams {
  prompt: string       // directivas musicales (genre, mood, instruments)
  lyrics: string       // letra completa de la canción
  title?: string
  make_instrumental?: boolean
  wait_audio?: boolean // true = esperar hasta que el audio esté listo
}

export interface SunoClip {
  id: string
  audio_url: string
  title: string
  status: string
}

export interface SunoGenerateResponse {
  clips?: SunoClip[]
  // Algunos endpoints retornan array directo
  0?: SunoClip
  1?: SunoClip
}
