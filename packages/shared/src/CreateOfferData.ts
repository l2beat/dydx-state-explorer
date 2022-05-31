import { AssetId, StarkKey } from '@explorer/types'
import { z } from 'zod'

import { toJsonWithoutBigInts } from './serialize'
import { stringAs, stringAsBigInt } from './types'

export type CreateOfferData = z.infer<typeof CreateOfferData>
export const CreateOfferData = z.object({
  starkKeyA: stringAs(StarkKey),
  positionIdA: stringAsBigInt(),
  syntheticAssetId: stringAs(AssetId),
  amountCollateral: stringAsBigInt(),
  amountSynthetic: stringAsBigInt(),
  aIsBuyingSynthetic: z.boolean(),
})

export function serializeCreateOfferData(data: CreateOfferData) {
  return toJsonWithoutBigInts(data)
}

export function deserializeCreateOfferData(text: string): CreateOfferData {
  return CreateOfferData.parse(JSON.parse(text))
}
