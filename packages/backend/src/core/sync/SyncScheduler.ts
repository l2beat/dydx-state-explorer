import { BlockRange } from '../../model'
import { SyncStatusRepository } from '../../peripherals/database/SyncStatusRepository'
import { JobQueue } from '../../tools/JobQueue'
import { Logger } from '../../tools/Logger'
import { DataSyncService } from '../DataSyncService'
import { BlockDownloader } from './BlockDownloader'
import {
  INITIAL_SYNC_STATE,
  SyncSchedulerAction,
  syncSchedulerReducer,
  SyncState,
} from './syncSchedulerReducer'

export class SyncScheduler {
  private state: SyncState = INITIAL_SYNC_STATE
  private jobQueue: JobQueue

  constructor(
    private readonly syncStatusRepository: SyncStatusRepository,
    private readonly blockDownloader: BlockDownloader,
    private readonly dataSyncService: DataSyncService,
    private readonly logger: Logger
  ) {
    this.logger = logger.for(this)
    this.jobQueue = new JobQueue({ maxConcurrentJobs: 1 }, this.logger)
  }

  async start() {
    const lastSynced =
      await this.syncStatusRepository.getLastBlockNumberSynced()

    await this.dataSyncService.discardAfter(lastSynced)

    const knownBlocks = await this.blockDownloader.getKnownBlocks(lastSynced)
    this.dispatch({ type: 'initialized', lastSynced, knownBlocks })

    this.blockDownloader.onNewBlock((block) =>
      this.dispatch({ type: 'newBlockFound', block })
    )

    this.blockDownloader.onReorg((blocks) =>
      this.dispatch({ type: 'reorgOccurred', blocks })
    )

    this.logger.info('start', { lastSynced })
  }

  private dispatch(action: SyncSchedulerAction) {
    const [newState, effect] = syncSchedulerReducer(this.state, action)
    this.state = newState

    this.logger.debug({ method: 'dispatch', action: action.type })

    if (effect) {
      this.jobQueue.add({
        name: 'action',
        execute: async () => {
          this.logger.debug({ method: 'effect', effect: effect.type })

          if (effect.type === 'sync') {
            await this.handleSync(effect.blocks)
          } else if (effect.type === 'discardAfter') {
            await this.handleDiscardAfter(effect.blockNumber)
          }
        },
      })
    }
  }

  private async handleSync(blocks: BlockRange) {
    try {
      await this.dataSyncService.sync(blocks)
      await this.syncStatusRepository.setLastBlockNumberSynced(blocks.end - 1)
      this.dispatch({ type: 'syncSucceeded' })
    } catch (err) {
      this.dispatch({ type: 'syncFailed', blocks })
      this.logger.error(err)
    }
  }

  private async handleDiscardAfter(blockNumber: number) {
    try {
      await this.syncStatusRepository.setLastBlockNumberSynced(blockNumber)
      await this.dataSyncService.discardAfter(blockNumber)
      this.dispatch({ type: 'discardAfterSucceeded', blockNumber })
    } catch (err) {
      this.dispatch({ type: 'discardAfterFailed' })
      this.logger.error(err)
    }
  }
}
