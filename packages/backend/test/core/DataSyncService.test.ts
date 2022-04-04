import { EthereumAddress, Hash256 } from '@explorer/types'
import { expect } from 'earljs'

import { DataSyncService } from '../../src/core/DataSyncService'
import type { MemoryHashEventCollector } from '../../src/core/MemoryHashEventCollector'
import type { PageCollector } from '../../src/core/PageCollector'
import { StateTransitionFactCollector } from '../../src/core/StateTransitionFactCollector'
import { StateUpdateCollector } from '../../src/core/StateUpdateCollector'
import { UserRegistrationCollector } from '../../src/core/UserRegistrationCollector'
import type { VerifierCollector } from '../../src/core/VerifierCollector'
import { BlockRange } from '../../src/model'
import { StateTransitionFactRecord } from '../../src/peripherals/database/StateTransitionFactsRepository'
import { Logger } from '../../src/tools/Logger'
import { mock } from '../mock'

const noop = async () => {}

describe(DataSyncService.name, () => {
  describe(DataSyncService.prototype.sync.name, () => {
    const verifierAddresses = [
      EthereumAddress('0x0000000000000000000000000000000000000123'),
    ]
    const verifierCollector = mock<VerifierCollector>({
      collect: async (_blockRange) => verifierAddresses,
    })
    const memoryHashEventCollector = mock<MemoryHashEventCollector>({
      collect: async (_blockRange, _verifiers) => [],
    })
    const pageCollector = mock<PageCollector>({
      collect: async (_blockRange) => [],
    })

    const transitionFacts: StateTransitionFactRecord[] = [
      { hash: Hash256.fake('abcd'), blockNumber: 1 },
    ]

    const stateTransitionFactCollector = mock<StateTransitionFactCollector>({
      collect: async (_blockRange) => transitionFacts,
    })

    const userRegistrationCollector = mock<UserRegistrationCollector>({
      collect: async () => [],
    })
    const stateUpdateCollector = mock<StateUpdateCollector>({
      save: noop,
    })

    const service = new DataSyncService(
      verifierCollector,
      memoryHashEventCollector,
      pageCollector,
      stateTransitionFactCollector,
      stateUpdateCollector,
      userRegistrationCollector,
      Logger.SILENT
    )

    it('collects data', async () => {
      const blockRange = { start: 10, end: 25 } as BlockRange
      await service.sync(blockRange)

      expect(verifierCollector.collect).toHaveBeenCalledExactlyWith([
        [blockRange],
      ])
      expect(memoryHashEventCollector.collect).toHaveBeenCalledExactlyWith([
        [blockRange, verifierAddresses],
      ])
      expect(pageCollector.collect).toHaveBeenCalledExactlyWith([[blockRange]])
      expect(stateTransitionFactCollector.collect).toHaveBeenCalledExactlyWith([
        [blockRange],
      ])
      expect(stateUpdateCollector.save).toHaveBeenCalledExactlyWith([
        [transitionFacts],
      ])
    })
  })

  describe(DataSyncService.prototype.discardAfter.name, () => {
    it('discards data from block number', async () => {
      const verifierCollector = mock<VerifierCollector>({ discardAfter: noop })
      const memoryHashEventCollector = mock<MemoryHashEventCollector>({
        discardAfter: noop,
      })
      const pageCollector = mock<PageCollector>({ discardAfter: noop })
      const stateTransitionFactCollector = mock<StateTransitionFactCollector>({
        discardAfter: noop,
      })
      const userRegistrationCollector = mock<UserRegistrationCollector>({
        discardAfter: noop,
      })
      const stateUpdateCollector = mock<StateUpdateCollector>({
        discardAfter: noop,
      })

      const dataSyncService = new DataSyncService(
        verifierCollector,
        memoryHashEventCollector,
        pageCollector,
        stateTransitionFactCollector,
        stateUpdateCollector,
        userRegistrationCollector,
        Logger.SILENT
      )

      await dataSyncService.discardAfter(10)

      expect(verifierCollector.discardAfter).toHaveBeenCalledWith([10])
      expect(memoryHashEventCollector.discardAfter).toHaveBeenCalledWith([10])
      expect(pageCollector.discardAfter).toHaveBeenCalledWith([10])
      expect(stateTransitionFactCollector.discardAfter).toHaveBeenCalledWith([
        10,
      ])
      expect(stateUpdateCollector.discardAfter).toHaveBeenCalledWith([10])
    })
  })
})
