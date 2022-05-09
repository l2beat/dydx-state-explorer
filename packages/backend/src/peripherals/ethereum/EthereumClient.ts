import { Hash256 } from '@explorer/types'
import { assert } from 'console'
import { ethers, providers } from 'ethers'

import { BlockRange } from '../../model'
import { BlockTag } from './types'

export class EthereumClient {
  private readonly provider: providers.Provider

  constructor(rpcUrl: string)
  constructor(provider: providers.Provider)
  constructor(provider: string | providers.Provider) {
    this.provider =
      provider instanceof providers.Provider
        ? provider
        : new ethers.providers.JsonRpcProvider(provider)
  }

  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber()
  }

  async getBlock(blockTagOrHash: BlockTag | Hash256): Promise<providers.Block> {
    return await this.provider.getBlock(
      typeof blockTagOrHash === 'number'
        ? blockTagOrHash
        : blockTagOrHash.toString()
    )
  }

  async getLogs(filter: providers.Filter) {
    return await this.provider.getLogs(filter)
  }

  async getLogsInRange(blockRange: BlockRange, filter: providers.Filter) {
    if (blockRange.isEmpty()) {
      return []
    }
    const logs = await this.provider.getLogs({
      ...filter,
      fromBlock: blockRange.start,
      toBlock: blockRange.end - 1,
    })
    assert(blockRange.hasAll(logs), 'all logs must be from the block range')
    return logs
  }

  async getTransaction(
    transactionHash: Hash256
  ): Promise<providers.TransactionResponse | null> {
    return await this.provider.getTransaction(transactionHash.toString())
  }

  async getTransactionReceipt(transactionHash: Hash256) {
    return await this.provider.getTransactionReceipt(transactionHash.toString())
  }

  onBlock(handler: (block: providers.Block) => void) {
    this.provider.on('block', handler)
    return () => {
      this.provider.off('block', handler)
    }
  }
}
