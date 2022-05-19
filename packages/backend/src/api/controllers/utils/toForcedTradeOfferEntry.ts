import { ForcedTradeOfferEntry } from '@explorer/frontend'

import { getTradeOfferPriceUSDCents } from '../../../core/getTradeOfferPriceUSDCents'
import {
  ForcedTradeInitialOfferRecord,
  ForcedTradeOfferRecord,
} from '../../../peripherals/database/ForcedTradeOfferRepository'

export function toForcedTradeOfferEntry(
  offer: ForcedTradeInitialOfferRecord | ForcedTradeOfferRecord
): ForcedTradeOfferEntry {
  return {
    id: offer.id,
    createdAt: offer.createdAt,
    type: offer.aIsBuyingSynthetic ? 'buy' : 'sell',
    amount: offer.amountSynthetic,
    assetId: offer.syntheticAssetId,
    positionId: offer.positionIdA,
    price: getTradeOfferPriceUSDCents(
      offer.amountCollateral,
      offer.syntheticAssetId,
      offer.amountSynthetic
    ),
    total: offer.amountCollateral,
  }
}
