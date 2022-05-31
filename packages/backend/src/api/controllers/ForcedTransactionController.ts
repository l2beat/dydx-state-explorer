import {
  ForcedTransaction,
  renderForcedTransactionDetailsPage,
  renderForcedTransactionsIndexPage,
  renderTransactionForm,
} from '@explorer/frontend'
import { AssetId, EthereumAddress, Hash256 } from '@explorer/types'

import {
  ForcedTransactionRecord,
  ForcedTransactionsRepository,
} from '../../peripherals/database/ForcedTransactionsRepository'
import { PositionRepository } from '../../peripherals/database/PositionRepository'
import { UserRegistrationEventRepository } from '../../peripherals/database/UserRegistrationEventRepository'
import { ControllerResult } from './ControllerResult'
import { toForcedTransactionEntry } from './utils/toForcedTransactionEntry'
import { toForcedTransactionHistory } from './utils/toForcedTransactionHistory'
import { toPositionAssetEntries } from './utils/toPositionAssetEntries'

export class ForcedTransactionController {
  constructor(
    private userRegistrationEventRepository: UserRegistrationEventRepository,
    private positionRepository: PositionRepository,
    private forcedTransactionsRepository: ForcedTransactionsRepository,
    private perpetualAddress: EthereumAddress
  ) {}

  async getForcedTransactionsPage(
    page: number,
    perPage: number,
    account: EthereumAddress | undefined
  ): Promise<ControllerResult> {
    const limit = perPage
    const offset = (page - 1) * perPage
    const [transactions, total] = await Promise.all([
      this.forcedTransactionsRepository.getLatest({ limit, offset }),
      this.forcedTransactionsRepository.countAll(),
    ])

    const content = renderForcedTransactionsIndexPage({
      account,
      transactions: transactions.map(toForcedTransactionEntry),
      total,
      params: { page, perPage },
    })
    return { type: 'success', content }
  }

  private async toForcedTransaction(
    transaction: ForcedTransactionRecord
  ): Promise<ForcedTransaction> {
    if (transaction.data.type === 'withdrawal') {
      const user = await this.userRegistrationEventRepository.findByStarkKey(
        transaction.data.publicKey
      )
      return {
        type: 'exit',
        data: {
          ethereumAddress: user?.ethAddress,
          positionId: transaction.data.positionId,
          transactionHash: transaction.hash,
          value: transaction.data.amount,
          stateUpdateId: transaction.updates.verified?.stateUpdateId,
        },
      }
    }
    const [userA, userB] = await Promise.all([
      this.userRegistrationEventRepository.findByStarkKey(
        transaction.data.publicKeyA
      ),
      this.userRegistrationEventRepository.findByStarkKey(
        transaction.data.publicKeyB
      ),
    ])
    return {
      type: transaction.data.isABuyingSynthetic ? 'buy' : 'sell',
      data: {
        displayId: transaction.hash,
        positionIdA: transaction.data.positionIdA,
        positionIdB: transaction.data.positionIdB,
        addressA: userA?.ethAddress,
        addressB: userB?.ethAddress,
        amountSynthetic: transaction.data.syntheticAmount,
        amountCollateral: transaction.data.collateralAmount,
        syntheticAssetId: transaction.data.syntheticAssetId,
        transactionHash: transaction.hash,
      },
    }
  }

  async getForcedTransactionDetailsPage(
    transactionHash: Hash256,
    account: EthereumAddress | undefined
  ): Promise<ControllerResult> {
    const transaction = await this.forcedTransactionsRepository.findByHash(
      transactionHash
    )
    if (!transaction) {
      const content = 'Could not find transaction for that hash'
      return { type: 'not found', content }
    }

    const content = renderForcedTransactionDetailsPage({
      account,
      history: toForcedTransactionHistory(transaction),
      transaction: await this.toForcedTransaction(transaction),
    })
    return { type: 'success', content }
  }

  async getTransactionFormPage(
    account: EthereumAddress | undefined
  ): Promise<ControllerResult> {
    if (!account) {
      return { type: 'redirect', url: '/' }
    }
    const id = await this.positionRepository.findIdByEthereumAddress(account)
    if (id === undefined) {
      return { type: 'redirect', url: '/' }
    }
    const position = await this.positionRepository.findByIdWithPrices(id)
    if (!position) {
      return { type: 'redirect', url: '/' }
    }

    const assets = toPositionAssetEntries(
      position.balances,
      position.collateralBalance,
      position.prices
    )

    if (
      assets.length === 0 ||
      (assets.length === 1 &&
        assets[0].assetId === AssetId.USDC &&
        assets[0].balance < 0n)
    ) {
      return { type: 'redirect', url: '/' }
    }

    return {
      type: 'success',
      content: renderTransactionForm({
        account,
        perpetualAddress: this.perpetualAddress,
        positionId: position.positionId,
        publicKey: position.publicKey,
        selectedAsset: assets[0].assetId,
        assets,
      }),
    }
  }
}
