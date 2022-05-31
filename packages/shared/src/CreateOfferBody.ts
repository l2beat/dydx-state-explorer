import { z } from 'zod'

import { CreateOfferData } from './CreateOfferData'
import { toJsonWithoutBigInts } from './serialize'

export type CreateOfferBody = z.infer<typeof CreateOfferBody>
export const CreateOfferBody = z.object({
  offer: CreateOfferData,
  signature: z.string(),
})

export function serializeCreateOfferBody(body: CreateOfferBody) {
  return toJsonWithoutBigInts(body)
}
