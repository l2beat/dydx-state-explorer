import { AssetId, EthereumAddress, StarkKey } from '@explorer/types'

import { ForcedHistoryEvent } from '../common/ForcedHistory'

export type ForcedTradeOffer = {
  readonly type: 'sell' | 'buy'
  readonly id: number
  readonly positionIdA: bigint
  readonly addressA: EthereumAddress
  readonly amountSynthetic: bigint
  readonly amountCollateral: bigint
  readonly syntheticAssetId: AssetId
  readonly positionIdB?: bigint
  readonly addressB?: EthereumAddress
}

export type ForcedTradeOfferDetailsProps = {
  readonly offer: ForcedTradeOffer
  readonly account: EthereumAddress | undefined
  readonly history: ForcedHistoryEvent[]
  readonly acceptForm?: {
    readonly nonce: bigint
    readonly positionIdB: bigint
    readonly premiumCost: boolean
    readonly starkKeyA: StarkKey
    readonly starkKeyB: StarkKey
    readonly submissionExpirationTime: bigint
    readonly aIsBuyingSynthetic: boolean
    readonly address: EthereumAddress
  }
}
