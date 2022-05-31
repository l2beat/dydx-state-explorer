import { Hash256, json } from '@explorer/types'
import { providers } from 'ethers'

import {
  BlockRecord,
  BlockRepository,
} from '../../peripherals/database/BlockRepository'
import { EthereumClient } from '../../peripherals/ethereum/EthereumClient'
import { createEventEmitter } from '../../tools/EventEmitter'
import { JobQueue } from '../../tools/JobQueue'
import { Logger } from '../../tools/Logger'

export interface BlockDownloaderEvents {
  newBlock: BlockRecord
  reorg: BlockRecord[]
}

const SAFE_BLOCK_DISTANCE = 100

export class BlockDownloader {
  private events = createEventEmitter<BlockDownloaderEvents>()
  private jobQueue: JobQueue

  private lastKnown = 0
  private queueTip = 0
  private started = false

  constructor(
    private ethereumClient: EthereumClient,
    private blockRepository: BlockRepository,
    private logger: Logger,
    private safeBlockDistance = SAFE_BLOCK_DISTANCE
  ) {
    this.logger = this.logger.for(this)
    this.jobQueue = new JobQueue({ maxConcurrentJobs: 1 }, this.logger)
  }

  async start() {
    this.started = true
    this.lastKnown = (await this.blockRepository.findLast())?.number ?? 0
    this.queueTip = await this.ethereumClient.getBlockNumber()

    const queueStart = Math.max(
      this.lastKnown + 1,
      this.queueTip - this.safeBlockDistance + 1
    )

    if (this.lastKnown !== 0 && this.lastKnown + 1 < queueStart) {
      this.addJob(this.lastKnown + 1)
    }

    for (let i = queueStart; i <= this.queueTip; i++) {
      this.addJob(i)
    }

    return this.ethereumClient.onBlock((block) => {
      const blockNumber = typeof block === 'number' ? block : block.number
      for (let i = this.queueTip + 1; i <= blockNumber; i++) {
        this.addJob(i)
        this.queueTip = i
      }
    })
  }

  getStatus(): json {
    return {
      started: this.started,
      lastKnown: this.lastKnown,
      queueTip: this.queueTip,
    }
  }

  async getKnownBlocks(from: number) {
    const lastKnown = await this.blockRepository.findLast()
    if (!lastKnown) {
      return []
    }
    return this.blockRepository.getAllInRange(from, lastKnown.number)
  }

  onNewBlock(handler: (blocks: BlockRecord) => void) {
    this.events.on('newBlock', handler)
    return () => {
      this.events.off('newBlock', handler)
    }
  }

  onReorg(handler: (newBlocks: BlockRecord[]) => void) {
    this.events.on('reorg', handler)
    return () => {
      this.events.off('reorg', handler)
    }
  }

  private addJob(blockNumber: number) {
    this.jobQueue.add({
      name: `advanceChain-${blockNumber}`,
      execute: async () => {
        const event = await this.advanceChain(blockNumber)
        this.events.emit(event[0], event[1])
      },
    })
  }

  private async advanceChain(blockNumber: number) {
    let [block, parent] = await Promise.all([
      this.ethereumClient.getBlock(blockNumber),
      this.getKnownBlock(blockNumber - 1),
    ])
    if (Hash256(block.parentHash) === parent.hash) {
      const record: BlockRecord = {
        number: block.number,
        hash: Hash256(block.hash),
      }
      await this.blockRepository.addMany([record])
      this.lastKnown = blockNumber
      return ['newBlock', record] as const
    } else {
      const changed: providers.Block[] = [block]
      let current = blockNumber
      while (Hash256(block.parentHash) !== parent.hash) {
        current--
        ;[block, parent] = await Promise.all([
          this.ethereumClient.getBlock(Hash256(block.parentHash)),
          this.getKnownBlock(current - 1),
        ])
        changed.push(block)
      }
      const records = changed.reverse().map((block) => ({
        number: block.number,
        hash: Hash256(block.hash),
      }))
      await this.blockRepository.deleteAfter(records[0].number - 1)
      await this.blockRepository.addMany(records)
      this.lastKnown = blockNumber
      return ['reorg', records] as const
    }
  }

  private async getKnownBlock(blockNumber: number): Promise<BlockRecord> {
    const known = await this.blockRepository.findByNumber(blockNumber)
    if (known) {
      return known
    }
    const downloaded = await this.ethereumClient.getBlock(blockNumber)
    const record: BlockRecord = {
      number: downloaded.number,
      hash: Hash256(downloaded.hash),
    }
    await this.blockRepository.addMany([record])
    return record
  }
}
