import { PedersenHash } from '@explorer/crypto'
import { OnChainData } from '@explorer/encoding'
import { zip } from 'lodash'

import { NodeOrLeaf } from './MerkleNode'
import { MerkleTree } from './MerkleTree'
import { Position } from './Position'

export interface RollupParameters {
  readonly timestamp: bigint
  readonly funding: ReadonlyMap<string, bigint>
}

export interface IRollupStateStorage {
  getParameters(rootHash: PedersenHash): Promise<RollupParameters>
  setParameters(rootHash: PedersenHash, values: RollupParameters): Promise<void>

  recover(hash: PedersenHash): Promise<NodeOrLeaf<Position>>
  persist(values: NodeOrLeaf<Position>[]): Promise<void>
}

export type OnChainUpdate = Pick<OnChainData, 'positions' | 'funding'>

export class RollupState {
  constructor(
    private readonly storage: IRollupStateStorage,
    public readonly positions: MerkleTree<Position>,
    private timestamp?: bigint,
    private funding?: ReadonlyMap<string, bigint>
  ) {}

  static recover(
    storage: IRollupStateStorage,
    rootHash: PedersenHash,
    height = 64n
  ) {
    return new RollupState(storage, new MerkleTree(storage, height, rootHash))
  }

  static async empty(storage: IRollupStateStorage, height = 64n) {
    return new RollupState(
      storage,
      await MerkleTree.create(storage, height, Position.EMPTY),
      0n,
      new Map()
    )
  }

  async update(onChainData: OnChainUpdate) {
    const fundingByTimestamp = await this.getFundingByTimestamp(onChainData)
    const updatedPositionIds = onChainData.positions.map((x) => x.positionId)

    const oldPositions = await this.positions.getLeaves(updatedPositionIds)
    const newPositions = zip(oldPositions, onChainData.positions).map(
      ([oldPosition, update]) => {
        if (!oldPosition || !update) {
          throw new Error('Invalid update count')
        }
        const funding =
          update.fundingTimestamp !== 0n
            ? fundingByTimestamp.get(update.fundingTimestamp)
            : new Map<string, bigint>()
        if (!funding) {
          throw new Error('Missing funding!')
        }
        const updatedAssets = new Set(update.balances.map((x) => x.assetId))
        const assets = oldPosition.assets.filter(
          (x) => !updatedAssets.has(x.assetId)
        )
        for (const updated of update.balances) {
          if (updated.balance === 0n) {
            continue
          }
          const fundingIndex = funding.get(updated.assetId)
          if (fundingIndex === undefined) {
            throw new Error('Missing funding!')
          }
          assets.push({
            assetId: updated.assetId,
            balance: updated.balance,
            fundingIndex: fundingIndex,
          })
        }
        const newPosition = new Position(
          update.publicKey,
          update.collateralBalance,
          assets
        )
        return { index: update.positionId, value: newPosition }
      }
    )

    const positions = await this.positions.update(newPositions)
    const [timestamp, funding] = [...fundingByTimestamp.entries()].reduce(
      (a, b) => (a[0] > b[0] ? a : b)
    )
    return new RollupState(this.storage, positions, timestamp, funding)
  }

  private async getFundingByTimestamp(onChainData: OnChainUpdate) {
    const { timestamp, funding } = await this.getParameters()
    const fundingByTimestamp = new Map<bigint, ReadonlyMap<string, bigint>>()
    fundingByTimestamp.set(timestamp, funding)
    for (const { timestamp, indices } of onChainData.funding) {
      const funding = new Map<string, bigint>()
      for (const { assetId, value } of indices) {
        funding.set(assetId, value)
      }
      fundingByTimestamp.set(timestamp, funding)
    }
    return fundingByTimestamp
  }

  async getParameters(): Promise<RollupParameters> {
    if (this.timestamp === undefined || this.funding === undefined) {
      const { timestamp, funding } = await this.storage.getParameters(
        await this.positions.hash()
      )
      this.timestamp = timestamp
      this.funding = funding
    }
    return {
      timestamp: this.timestamp,
      funding: this.funding,
    }
  }
}