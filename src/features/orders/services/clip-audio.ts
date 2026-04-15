/**
 * Recorta un buffer de audio al porcentaje indicado.
 *
 * Para MP3: busca el frame sync más cercano al punto de corte (0xFF 0xEx)
 * buscando hacia atrás, hasta 8 KB. Evita cortar en medio de un frame.
 *
 * Para otros formatos (OGG, WAV): corta en el byte más cercano al objetivo
 * sin búsqueda de frame sync, ya que el formato no lo permite sin un parser.
 *
 * Devuelve { preview, full } como Buffers.
 */
export function clipAudio(
  fullBuffer: Buffer,
  previewFraction = 0.5,
  format: 'mp3' | 'ogg' | 'wav' = 'mp3',
): { preview: Buffer; full: Buffer } {
  const targetByte = Math.floor(fullBuffer.length * previewFraction)
  let cutPoint = targetByte

  if (format === 'mp3') {
    for (let i = targetByte; i > targetByte - 8192 && i > 0; i--) {
      // Verificar bounds antes de acceder a i+1
      if (i + 1 < fullBuffer.length && fullBuffer[i] === 0xff && (fullBuffer[i + 1] & 0xe0) === 0xe0) {
        cutPoint = i
        break
      }
    }
  }

  return {
    preview: fullBuffer.subarray(0, cutPoint),
    full: fullBuffer,
  }
}
