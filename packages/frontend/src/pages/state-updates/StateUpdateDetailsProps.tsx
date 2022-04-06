import { Hash256, PedersenHash, Timestamp } from '@explorer/types'

export interface StateUpdateDetailsProps {
  readonly id: number
  readonly hash: Hash256
  readonly rootHash: PedersenHash
  readonly blockNumber: number
  readonly timestamp: Timestamp
  positions: ReadonlyArray<{
    readonly publicKey: string
    readonly positionId: bigint
    readonly totalUSDCents: bigint
    readonly previousTotalUSDCents?: bigint
    readonly assetsUpdated?: number
  }>
}
