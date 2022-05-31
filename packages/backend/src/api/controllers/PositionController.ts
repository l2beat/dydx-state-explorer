import {
  renderPositionAtUpdatePage,
  renderPositionDetailsPage,
} from '@explorer/frontend'
import { EthereumAddress } from '@explorer/types'

import { ForcedTransactionsRepository } from '../../peripherals/database/ForcedTransactionsRepository'
import { PositionRepository } from '../../peripherals/database/PositionRepository'
import { StateUpdateRepository } from '../../peripherals/database/StateUpdateRepository'
import { UserRegistrationEventRepository } from '../../peripherals/database/UserRegistrationEventRepository'
import { ControllerResult } from './ControllerResult'
import { countUpdatedAssets } from './utils/countUpdatedAssets'
import { toForcedTransactionEntry } from './utils/toForcedTransactionEntry'
import { toPositionAssetEntries } from './utils/toPositionAssetEntries'

export class PositionController {
  constructor(
    private stateUpdateRepository: StateUpdateRepository,
    private positionRepository: PositionRepository,
    private userRegistrationEventRepository: UserRegistrationEventRepository,
    private forcedTransactionsRepository: ForcedTransactionsRepository
  ) {}

  async getPositionDetailsPage(
    positionId: bigint,
    account: EthereumAddress | undefined
  ): Promise<ControllerResult> {
    const [history, transactions] = await Promise.all([
      this.positionRepository.getHistoryById(positionId),
      this.forcedTransactionsRepository.getAffectingPosition(positionId),
    ])

    if (!history[0]) {
      const content = 'Position not found'
      return { type: 'not found', content }
    }

    const historyWithAssets = history.map((update) => {
      const assets = toPositionAssetEntries(
        update.balances,
        update.collateralBalance,
        update.prices
      )
      const totalUSDCents = assets.reduce(
        (total, { totalUSDCents }) => totalUSDCents + total,
        0n
      )
      return {
        ...update,
        assets,
        totalUSDCents,
      }
    })

    const current = historyWithAssets[0]

    const lastUserRegistrationEvent =
      await this.userRegistrationEventRepository.findByStarkKey(
        current.publicKey
      )

    const content = renderPositionDetailsPage({
      account,
      positionId,
      publicKey: current.publicKey,
      ethAddress: lastUserRegistrationEvent?.ethAddress,
      stateUpdateId: current.stateUpdateId,
      lastUpdateTimestamp: current.timestamp,
      assets: current.assets,
      history: historyWithAssets.map((update, i) => {
        const previousUpdate = historyWithAssets[i + 1]
        const assetsUpdated = previousUpdate
          ? countUpdatedAssets(previousUpdate.balances, update.balances)
          : 0
        return {
          stateUpdateId: update.stateUpdateId,
          totalUSDCents: update.totalUSDCents,
          assetsUpdated,
        }
      }),
      transactions: transactions.map(toForcedTransactionEntry),
      pendingOffers: [], //TODO: implement
    })
    return { type: 'success', content }
  }

  async getPositionUpdatePage(
    positionId: bigint,
    stateUpdateId: number,
    account: EthereumAddress | undefined
  ): Promise<ControllerResult> {
    const [history, update, transactions] = await Promise.all([
      this.positionRepository.getHistoryById(positionId),
      this.stateUpdateRepository.findByIdWithPositions(stateUpdateId),
      this.forcedTransactionsRepository.getIncludedInStateUpdate(stateUpdateId),
    ])
    const updateIndex = history.findIndex(
      (p) => p.stateUpdateId === stateUpdateId
    )
    if (updateIndex === -1 || !update) {
      const content = 'Update not found'
      return { type: 'not found', content }
    }
    const position = history[updateIndex]
    const previousPosition = history[updateIndex + 1]
    const assetChanges = position.balances.map((balance) => {
      const previousBalance =
        previousPosition?.balances.find((b) => b.assetId === balance.assetId)
          ?.balance || 0n
      const currentBalance = balance.balance
      return {
        assetId: balance.assetId,
        previousBalance,
        currentBalance,
        balanceDiff: currentBalance - previousBalance,
      }
    })

    const content = renderPositionAtUpdatePage({
      account,
      stateUpdateId,
      positionId,
      lastUpdateTimestamp: update.timestamp,
      previousPublicKey: previousPosition?.publicKey,
      publicKey: position.publicKey,
      assetChanges,
      transactions: transactions
        .filter((t) => {
          return t.data.type === 'trade'
            ? [t.data.positionIdA, t.data.positionIdB].includes(positionId)
            : t.data.positionId === positionId
        })
        .map(toForcedTransactionEntry),
    })
    return { type: 'success', content }
  }
}
