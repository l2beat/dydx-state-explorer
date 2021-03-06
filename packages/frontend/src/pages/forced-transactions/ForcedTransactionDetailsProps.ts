import { AssetId, EthereumAddress, Hash256 } from '@explorer/types'

import { AccountDetails } from '../common/AccountDetails'
import { ForcedHistoryEvent } from '../common/ForcedHistory'

export type ForcedTransaction = ForcedExit | ForcedBuy | ForcedSell

export type ForcedTradeData = {
  readonly positionIdA: bigint
  readonly addressA?: EthereumAddress
  readonly syntheticAmount: bigint
  readonly collateralAmount: bigint
  readonly syntheticAssetId: AssetId
  readonly positionIdB: bigint
  readonly addressB?: EthereumAddress
  readonly transactionHash: Hash256
  readonly stateUpdateId?: number
}

export interface ForcedSell {
  readonly type: 'sell'
  readonly data: ForcedTradeData
}

export interface ForcedBuy {
  readonly type: 'buy'
  readonly data: ForcedTradeData
}

export interface ForcedExit {
  readonly type: 'exit'
  readonly data: {
    readonly transactionHash: Hash256
    readonly positionId: bigint
    readonly ethereumAddress?: EthereumAddress
    readonly value: bigint
    readonly stateUpdateId?: number
  }
}

export type ForcedTransactionDetailsProps = {
  readonly account: AccountDetails | undefined
  readonly transaction: ForcedTransaction
  readonly history: ForcedHistoryEvent[]
}
