import { ethers } from 'ethers'

import { Block, BlockTag, Filter, FilterByBlockHash } from './types'

export class EthereumClient {
  private provider = new ethers.providers.JsonRpcProvider(this.rpcUrl)

  constructor(private readonly rpcUrl: string) {}

  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber()
  }

  async getBlock(blockTagOrHash: BlockTag): Promise<Block> {
    return await this.provider.getBlock(blockTagOrHash)
  }

  async getLogs(filter: Filter | FilterByBlockHash) {
    return await this.provider.getLogs(filter)
  }

  async getTransaction(transactionHash: string) {
    return await this.provider.getTransaction(transactionHash)
  }
}