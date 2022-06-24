import { decodeOnChainData, ForcedAction } from '@explorer/encoding'
import { RollupState } from '@explorer/state'
import { Hash256, PedersenHash, Timestamp } from '@explorer/types'

import { ForcedTransactionsRepository } from '../peripherals/database/ForcedTransactionsRepository'
import { PageRepository } from '../peripherals/database/PageRepository'
import { PositionRecord } from '../peripherals/database/PositionRepository'
import { RollupStateRepository } from '../peripherals/database/RollupStateRepository'
import { StateTransitionFactRecord } from '../peripherals/database/StateTransitionFactsRepository'
import { StateUpdateRepository } from '../peripherals/database/StateUpdateRepository'
import { EthereumClient } from '../peripherals/ethereum/EthereumClient'
import { BlockNumber } from '../peripherals/ethereum/types'
import { Logger } from '../tools/Logger'

/**
 * @internal
 * Same as `await RollupState.empty().then(empty => empty.positions.hash())`
 */
export const ROLLUP_STATE_EMPTY_HASH = PedersenHash(
  '52ddcbdd431a044cf838a71d194248640210b316d7b1a568997ecad9dec9626'
)

interface StateTransition {
  blockNumber: number
  factHash: Hash256
  pages: string[]
}

export class StateUpdateCollector {
  constructor(
    private readonly pageRepository: PageRepository,
    private readonly stateUpdateRepository: StateUpdateRepository,
    private readonly rollupStateRepository: RollupStateRepository,
    private readonly ethereumClient: EthereumClient,
    private readonly forcedTransactionsRepository: ForcedTransactionsRepository,
    private readonly logger: Logger,
    private rollupState?: RollupState
  ) {}

  async save(stateTransitionFacts: Omit<StateTransitionFactRecord, 'id'>[]) {
    if (stateTransitionFacts.length === 0) {
      return
    }

    const dbTransitions = await this.pageRepository.getByFactHashes(
      stateTransitionFacts.map((f) => f.hash)
    )
    const stateTransitions = dbTransitions.map((x, i) => ({
      ...x,
      blockNumber: stateTransitionFacts[i].blockNumber,
    }))
    if (dbTransitions.length !== stateTransitionFacts.length) {
      throw new Error('Missing state transition facts in database')
    }

    const { oldHash, id } = await this.readLastUpdate()
    await this.ensureRollupState(oldHash)

    for (const [i, stateTransition] of stateTransitions.entries()) {
      await this.processStateTransition(stateTransition, id + i + 1)
    }
  }

  async processStateTransition(
    { pages, factHash, blockNumber }: StateTransition,
    id: number
  ) {
    if (!this.rollupState) {
      return
    }
    const block = await this.ethereumClient.getBlock(blockNumber)
    const timestamp = Timestamp.fromSeconds(block.timestamp)

    const decoded = decodeOnChainData(pages)

    const [rollupState, newPositions] = await this.rollupState.update(decoded)
    this.rollupState = rollupState

    const rootHash = await rollupState.positions.hash()
    if (rootHash !== decoded.newState.positionRoot) {
      throw new Error('State transition calculated incorrectly')
    }
    const transactionHashes = await this.extractTransactionHashes(
      decoded.forcedActions
    )
    await Promise.all([
      this.stateUpdateRepository.add({
        stateUpdate: {
          id,
          blockNumber,
          factHash,
          rootHash,
          timestamp,
        },
        positions: newPositions.map(
          ({ value, index }): PositionRecord => ({
            positionId: index,
            starkKey: value.starkKey,
            balances: value.assets,
            collateralBalance: value.collateralBalance,
          })
        ),
        prices: decoded.newState.oraclePrices,
        transactionHashes,
      }),
    ])
    this.logger.info('State updated', { id, blockNumber })
  }

  async extractTransactionHashes(
    forcedActions: ForcedAction[]
  ): Promise<Hash256[]> {
    const hashes =
      await this.forcedTransactionsRepository.getTransactionHashesByData(
        forcedActions
      )
    const filteredHashes = hashes.filter(
      (h): h is Exclude<typeof h, undefined> => h !== undefined
    )

    if (filteredHashes.length !== forcedActions.length) {
      throw new Error(
        'Forced action included in state update does not have a matching mined transaction'
      )
    }

    return filteredHashes
  }

  async discardAfter(blockNumber: BlockNumber) {
    await this.stateUpdateRepository.deleteAfter(blockNumber)
  }

  private async readLastUpdate() {
    const lastUpdate = await this.stateUpdateRepository.findLast()
    if (lastUpdate) {
      return { oldHash: lastUpdate.rootHash, id: lastUpdate.id }
    }
    return { oldHash: ROLLUP_STATE_EMPTY_HASH, id: 0 }
  }

  async ensureRollupState(oldHash: PedersenHash, height?: bigint) {
    if (!this.rollupState) {
      if (oldHash === ROLLUP_STATE_EMPTY_HASH) {
        this.rollupState = await RollupState.empty(
          this.rollupStateRepository,
          height
        )
      } else {
        this.rollupState = RollupState.recover(
          this.rollupStateRepository,
          oldHash
        )
      }
    } else if ((await this.rollupState.positions.hash()) !== oldHash) {
      this.rollupState = RollupState.recover(
        this.rollupStateRepository,
        oldHash
      )
    }
    return this.rollupState
  }
}
