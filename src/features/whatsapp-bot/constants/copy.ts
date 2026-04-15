/** Mensajes del asistente WhatsApp (personalidad primo/compa). */

export const GREETING_MESSAGE = `¡Qué onda, compa! 👋 Aquí hacemos corridos y canciones personalizadas para ti o para quien tú quieras: cumpleaños, boda, aniversario, lo que sea.

¿Para quién sería la canción o qué ocasión tienes en mente? Cuéntame un poco.`

export const CLOSE_NOT_QUALIFIED_MESSAGE = `Sin problema, compa. Si más adelante te animas con una canción personalizada, aquí estaré. Que estés bien. 🙌`

export const NEXT_STEP_QUALIFIED_MESSAGE = `¡Qué padre! Para armarte tu canción necesito que me cuentes la historia o dedicatoria (puede ser en texto o en audio) y qué estilo te late: corrido tumbado, corrido norteño, corrido sierreño o banda. ¿Me platicas?`

// --- Flujo post-calificación ---

export const ASK_STORY_MESSAGE = `¡Perfecto, compa! 🎶 Cuéntame la historia o dedicatoria para la canción. Puede ser en uno o varios mensajes, como tú quieras.`

export const STORY_RECEIVED_ASK_STYLE_MESSAGE = `¡Ya tengo tu historia, qué bonita! 🙌 Ahora dime, ¿qué estilo te late para la canción?

🎵 *Corrido Tumbado* — estilo moderno, oscuro y épico
🎵 *Corrido Norteño* — acordeón y bajo sexto, estilo fronterizo
🎵 *Corrido Sierreño* — guitarras y acordeón, muy pegajoso
🎵 *Banda* — metales, tuba y tambora, pura fiesta

¿Cuál te gusta?`

// --- Aclaración de detalles ---

/**
 * Prefijo que se añade antes de las preguntas de aclaración generadas por IA.
 * El bot pregunta detalles clave que enriquecen el corrido (año, apodo, etc.).
 */
export function buildClarificationMessage(questions: string): string {
  return `Una cosita más, primo 🤠\n\n${questions}\n\nCon eso ya tenemos todo para armar tu corrido.`
}

export const CLARIFICATION_DONE_MESSAGE = `¡Perfecto, compa! 🙌 Con eso ya tengo todo lo que necesito. Dame un momento...`

export const GENERATING_LYRICS_MESSAGE = `¡Sale! Dame un momento, ya estoy componiendo tu canción con todo el corazón... 🎵`

export const AUDIO_COMING_MESSAGE = `¡Ya quedó la letra! Ahora la estoy grabando en audio para mandártela. Dame unos minutitos... 🎤`

export const LYRICS_INTRO_MESSAGE = `¡Listo, compa! Aquí está tu letra personalizada 🎶👇`

export const ORDER_ALREADY_PROCESSED_MESSAGE = `Tu canción ya está en proceso, compa. En cuanto tengamos novedades te avisamos aquí mismo. 🙌`

// --- Flujo de pagos ---

interface PaymentAccount {
  banco: string
  cuenta: string
  clabe?: string
  titular: string
}

function parsePaymentAccounts(): PaymentAccount[] {
  try {
    const raw = process.env.PAYMENT_ACCOUNTS
    if (!raw) return []
    return JSON.parse(raw) as PaymentAccount[]
  } catch {
    return []
  }
}

function formatAccounts(accounts: PaymentAccount[]): string {
  if (accounts.length === 0) return '• [Configura PAYMENT_ACCOUNTS en .env]'
  return accounts
    .map((a, i) => {
      const lines = [
        accounts.length > 1 ? `*Opción ${i + 1} — ${a.banco}*` : `*${a.banco}*`,
        `• Cuenta: ${a.cuenta}`,
        a.clabe ? `• CLABE: ${a.clabe}` : null,
        `• Titular: ${a.titular}`,
      ].filter(Boolean)
      return lines.join('\n')
    })
    .join('\n\n')
}

export function buildPaymentRequestMessage(): string {
  const precio = process.env.PAYMENT_PRICE ?? '$X'
  const accounts = parsePaymentAccounts()

  return `¡Tu canción quedó increíble! 🎶

Para entregarte la versión completa, el costo es de *${precio}*.

💳 *Datos para depósito / transferencia:*
${formatAccounts(accounts)}

Cuando hagas el pago, mándame la foto del comprobante y en breve te confirmo. 🙌`
}

export const PAYMENT_PROOF_RECEIVED_MESSAGE = `¡Recibí tu comprobante, compa! ✅ Ya lo estamos verificando. En cuanto lo confirmemos, te entrego tu canción. Un momento...`

export const PAYMENT_PROOF_FAILED_MESSAGE = `Recibí tu imagen, compa, pero hubo un problema al procesarla. No te preocupes, ya le avisé al equipo para revisarlo manualmente. En breve te contactamos. 🙌`

export const AUDIO_PREVIEW_MESSAGE = `🎵 ¡Aquí está el preview de tu canción! Escúchala y si quieres ajustar algo del estilo o la letra, me dices. Para recibir la versión final completa, procede con el pago. 🙌`

export const SONG_DELIVERED_MESSAGE = `¡Listo, compa! 🎉 Tu canción ya está lista. Aquí te la mando con todo el cariño. ¡Espero que les encante! 🎶`

export const SONG_DELIVERY_CLOSING_MESSAGE = `Gracias por confiar en nosotros, compa. 🙌 ¡Que la disfruten mucho!

👉 Si en algún momento quieres *otra canción* — para tus hijos, tu esposa, tus compadres, quien sea — aquí estamos. Solo escríbeme y arrancamos. 🎶`

// --- Video personalizado add-on ---

export function buildVideoOfferMessage(): string {
  const price = process.env.VIDEO_PRICE_USD ?? 'X'
  return `¿Sabes qué sería increíble? 🎬 Un *video personalizado* con tus fotos y la canción que acabamos de hacer.

Solo cuesta *$${price} USD* y quedará para compartir en redes o guardar para siempre.

¿Te interesa? Responde *SÍ* para empezar o *NO* si por ahora no.`
}

export const VIDEO_REJECTED_MESSAGE = `¡Sin problema, compa! 🙌 Ya tienes tu canción. Si en otro momento quieres el video, aquí estamos. ¡Que la disfruten mucho!`

export const ASK_PHOTOS_MESSAGE = `¡Perfecto! 📸 Mándame las fotos que quieras incluir en el video (máximo 10). Pueden ser del festejado, la pareja, familia... las que tú quieras. Cuando termines de mandarlas, escribe *listo*.`

export const PHOTOS_RECEIVED_MESSAGE = `📷 ¡Foto recibida! Sigue mandando las que quieras (máximo 10). Cuando termines, escribe *listo*.`

export const PHOTOS_CONFIRMED_MESSAGE = `¡Listo, compa! 🎬 Ya tengo tus fotos. Estoy armando tu video con la canción... en unos minutos te aviso cuando esté listo. ¡Va a quedar increíble! 🙌`

export function buildVideoReadyMessage(): string {
  const price = process.env.VIDEO_PRICE_USD ?? 'X'
  const accounts = parsePaymentAccounts()
  return `🎬 ¡Tu video personalizado ya está listo!

Para recibirlo, realiza tu pago de *$${price} USD*:

💳 *Datos para depósito / transferencia:*
${formatAccounts(accounts)}

Cuando hagas el pago, mándame la foto del comprobante y te mando el video de inmediato. 🙌`
}

export const VIDEO_PAYMENT_PROOF_RECEIVED_MESSAGE = `¡Recibí tu comprobante! ✅ Lo estamos verificando. En cuanto lo confirmemos, te mandamos el enlace de tu video. Un momento...`

export const VIDEO_PAYMENT_PROOF_FAILED_MESSAGE = `Recibí tu imagen, compa, pero hubo un problema al procesarla. Ya le avisé al equipo para revisarlo. En breve te contactamos. 🙏`

export function buildVideoDeliveryMessage(youtubeUrl: string): string {
  return `🎬 ¡Aquí está tu video personalizado, compa!

▶️ ${youtubeUrl}

¡Espero que les encante! Compártelo con quien quieras. Gracias por confiar en nosotros. 🙌🎶`
}
