import { z } from 'zod'

export const QualifierResultSchema = z.object({
  qualified: z.boolean().describe('true si el lead muestra intención de pago y sentimiento positivo; false si no'),
  reason: z.string().nullable().describe('Razón breve de la clasificación para logs internos'),
})

export type QualifierResult = z.infer<typeof QualifierResultSchema>
