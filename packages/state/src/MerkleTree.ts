import { PedersenHash } from '@explorer/crypto'

import { IMerkleStorage } from './IMerkleStorage'
import { MerkleNode } from './MerkleNode'
import { MerkleUpdate } from './MerkleUpdate'
import { MerkleValue } from './MerkleValue'

export class MerkleTree {
  private maxIndex = 0n

  constructor(
    private readonly storage: IMerkleStorage,
    private readonly height: bigint,
    private rootHashOrValue: PedersenHash | MerkleValue
  ) {
    if (height < 0) {
      throw new TypeError('Height cannot be negative')
    }
    this.maxIndex = 2n ** height - 1n
  }

  static create(storage: IMerkleStorage, height: bigint, leaf: MerkleValue) {
    let root = leaf
    for (let i = 0; i < height; i++) {
      root = new MerkleNode(storage, root, root)
    }
    return new MerkleTree(storage, height, root)
  }

  private async root(): Promise<MerkleValue> {
    if (!(this.rootHashOrValue instanceof MerkleValue)) {
      this.rootHashOrValue = await this.storage.recover(this.rootHashOrValue)
    }
    return this.rootHashOrValue
  }

  async hash(): Promise<PedersenHash> {
    if (this.rootHashOrValue instanceof MerkleValue) {
      return this.rootHashOrValue.hash()
    }
    return this.rootHashOrValue
  }

  async get(index: bigint): Promise<MerkleValue> {
    if (index < 0n || index > this.maxIndex) {
      throw new TypeError('Index out of bounds')
    }
    const root = await this.root()
    if (root instanceof MerkleNode) {
      const center = 2n ** (this.height - 1n)
      return root.get(index, center, this.height - 1n)
    } else {
      return root
    }
  }

  async update(updates: MerkleUpdate[]) {
    if (updates.length === 0) {
      return
    }
    if (updates.some((x) => x.index < 0n || x.index > this.maxIndex)) {
      throw new TypeError('Index out of bounds')
    }
    const root = await this.root()
    if (root instanceof MerkleNode) {
      const center = 2n ** (this.height - 1n)
      this.rootHashOrValue = await root.update(
        updates,
        center,
        this.height - 1n
      )
    } else {
      if (updates.length !== 1) {
        throw new Error('Cannot replace leaf with multiple values')
      } else {
        this.rootHashOrValue = updates[0].value
      }
    }
  }
}
