import { EthereumAddress } from '@explorer/types'
import { expect } from 'earljs'

import { AccountService } from '../../src/core/AccountService'
import { ForcedTradeOfferRepository } from '../../src/peripherals/database/ForcedTradeOfferRepository'
import { ForcedTransactionsRepository } from '../../src/peripherals/database/ForcedTransactionsRepository'
import { PositionRepository } from '../../src/peripherals/database/PositionRepository'
import { mock } from '../mock'

describe(AccountService.name, () => {
  it('returns undefined for undefined', async () => {
    const accountService = new AccountService(
      mock<PositionRepository>(),
      mock<ForcedTradeOfferRepository>(),
      mock<ForcedTransactionsRepository>()
    )
    const result = await accountService.getAccount(undefined)
    expect(result).toEqual(undefined)
  })

  it('returns account without position id', async () => {
    const accountService = new AccountService(
      mock<PositionRepository>({
        findIdByEthereumAddress: async () => undefined,
      }),
      mock<ForcedTradeOfferRepository>(),
      mock<ForcedTransactionsRepository>()
    )
    const address = EthereumAddress.fake()
    const result = await accountService.getAccount(address)
    expect(result).toEqual({
      address,
    })
  })

  it('returns account with position id', async () => {
    const accountService = new AccountService(
      mock<PositionRepository>({
        findIdByEthereumAddress: async () => 123n,
      }),
      mock<ForcedTradeOfferRepository>({
        countActiveByPositionId: async () => 0,
      }),
      mock<ForcedTransactionsRepository>({
        countPendingByPositionId: async () => 0,
      })
    )
    const address = EthereumAddress.fake()
    const result = await accountService.getAccount(address)
    expect(result).toEqual({
      address,
      hasUpdates: false,
      positionId: 123n,
    })
  })

  it('returns has updates when active offers exist', async () => {
    const accountService = new AccountService(
      mock<PositionRepository>({
        findIdByEthereumAddress: async () => 123n,
      }),
      mock<ForcedTradeOfferRepository>({
        countActiveByPositionId: async () => 1,
      }),
      mock<ForcedTransactionsRepository>({
        countPendingByPositionId: async () => 0,
      })
    )
    const address = EthereumAddress.fake()
    const result = await accountService.getAccount(address)
    expect(result).toEqual({
      address,
      hasUpdates: true,
      positionId: 123n,
    })
  })
})
