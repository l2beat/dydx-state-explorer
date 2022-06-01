import { AssetId, Timestamp } from '@explorer/types'
import React from 'react'

import { AssetCell } from '../../common/AssetCell'
import { formatCurrencyUnits } from '../../formatting'
import { OfferType } from '../../offers'
import { PendingRow } from './row'

export interface PendingOfferEntry {
  type: OfferType
  syntheticAssetId: AssetId
  amountSynthetic: bigint
  amountCollateral: bigint
  accepted?: {
    submissionExpirationTime: bigint
  }
}

const CancelButton = () => (
  <button className="px-3 rounded bg-grey-300">Cancel</button>
)

const AcceptButton = () => (
  <button className="px-3 rounded bg-blue-100">Accept offer</button>
)

const FinalizeButton = () => (
  <button className="px-3 rounded bg-blue-100">Finalize</button>
)

interface PendingOffersProps {
  offers: readonly PendingOfferEntry[]
  ownedByYou: boolean
}

export function PendingOffers({ offers, ownedByYou }: PendingOffersProps) {
  return (
    <>
      <div className="mb-1.5 font-medium text-lg text-left">Pending Offers</div>
      <table
        className="w-full border-separate mb-12"
        style={{ borderSpacing: '0 4px' }}
      >
        {offers.map((offer, i) => (
          <PendingRow
            key={i}
            cells={[
              offer.type === 'buy' ? 'Buy' : 'Sell',
              formatCurrencyUnits(
                offer.amountSynthetic,
                offer.syntheticAssetId
              ),
              <AssetCell assetId={offer.syntheticAssetId} />,
              formatCurrencyUnits(offer.amountCollateral, AssetId.USDC),
              <AssetCell assetId={AssetId.USDC} />,
              offer.accepted ? 'Matched!' : 'Offer created',
              offer.accepted && (
                <span
                  data-timestamp={Timestamp.fromHours(
                    offer.accepted.submissionExpirationTime
                  )}
                >
                  ...
                </span>
              ),
              offer.accepted && ownedByYou && <button>Cancel</button>,
              offer.accepted ? (
                ownedByYou && <FinalizeButton />
              ) : ownedByYou ? (
                <CancelButton />
              ) : (
                <AcceptButton />
              ),
            ]}
            accent={!!offer.accepted}
            fullWidth={6}
            numeric={[1, 3]}
          />
        ))}
      </table>
    </>
  )
}
