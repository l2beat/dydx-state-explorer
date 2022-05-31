import { StarkKey } from '@explorer/types'
import { z } from 'zod'

import { toJsonWithoutBigInts } from './serialize'
import { stringAs, stringAsBigInt } from './types'

export type AcceptedData = z.infer<typeof AcceptedData>
export const AcceptedData = z.object({
  starkKeyB: stringAs(StarkKey),
  positionIdB: stringAsBigInt(),
  submissionExpirationTime: stringAsBigInt(),
  nonce: stringAsBigInt(),
  premiumCost: z.boolean(),
})

export function serializeAcceptedData(data: AcceptedData) {
  return toJsonWithoutBigInts(data)
}

export function deserializeAcceptedData(text: string): AcceptedData {
  return AcceptedData.parse(JSON.parse(text))
}
