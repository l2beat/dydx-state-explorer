import { z } from 'zod'

import { AcceptedData } from './AcceptedData'
import { toJsonWithoutBigInts } from './serialize'

export type AcceptOfferBody = z.infer<typeof AcceptOfferBody>
export const AcceptOfferBody = AcceptedData.extend({
  signature: z.string(),
})

export function serializeAcceptOfferBody(body: AcceptOfferBody) {
  return toJsonWithoutBigInts(body)
}
