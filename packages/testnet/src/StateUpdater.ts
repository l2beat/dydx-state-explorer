import {
  encodeOnChainData,
  ForcedAction,
  FundingEntry,
  OnChainData,
  OraclePrice,
  PositionUpdate,
  State,
} from '@explorer/encoding'
import { InMemoryRollupStorage, RollupState } from '@explorer/state'
import {
  EthereumAddress,
  Hash256,
  PedersenHash,
  StarkKey,
  Timestamp,
} from '@explorer/types'
import { solidityKeccak256 } from 'ethers/lib/utils'

import { Contracts } from './deployContracts'

export interface UpdateData {
  funding: FundingEntry[]
  positions: PositionUpdate[]
  forcedActions: ForcedAction[]
  prices: OraclePrice[]
}

export class StateUpdater {
  rollup?: RollupState
  lastState: State = {
    indices: [],
    oraclePrices: [],
    orderHeight: 64,
    orderRoot: PedersenHash.fake(),
    positionHeight: 64,
    positionRoot: PedersenHash.fake(),
    timestamp: Timestamp(Date.now()),
    systemTime: Timestamp(Date.now()),
  }

  constructor(private contracts: Contracts) {}

  async init() {
    const storage = new InMemoryRollupStorage()
    this.rollup = await RollupState.empty(storage)
    this.lastState.positionRoot = await this.rollup.positions.hash()
  }

  async registerUser(address: EthereumAddress, starkKey: StarkKey) {
    await this.contracts.perpetual.registerUser(
      address.toString(),
      starkKey.toString()
    )
    console.log(`Registered ${address} as ${starkKey}`)
  }

  async update(updateData: UpdateData) {
    if (!this.rollup) {
      throw new Error('Not initialized!')
    }

    const [nextRollup] = await this.rollup.update({
      funding: updateData.funding,
      positions: updateData.positions,
    })
    this.rollup = nextRollup
    const afterRoot = await this.rollup.positions.hash()

    const oldState = this.lastState
    const newState: State = {
      indices: [],
      oraclePrices: updateData.prices,
      orderHeight: 64,
      orderRoot: PedersenHash.fake(),
      positionHeight: 64,
      positionRoot: afterRoot,
      timestamp: Timestamp(Date.now()),
      systemTime: Timestamp(Date.now()),
    }
    this.lastState = newState

    const onChainData: OnChainData = {
      assetConfigHashes: [],
      conditions: [],
      configurationHash: Hash256.fake(),
      forcedActions: updateData.forcedActions,
      minimumExpirationTimestamp: 1n,
      modifications: [],
      oldState,
      newState,
      funding: updateData.funding,
      positions: updateData.positions,
    }

    await this.performStateTransition(onChainData)
  }

  private async performStateTransition(onChainData: OnChainData) {
    const pages = encodeOnChainData(onChainData)

    const pageHashes: string[] = []
    for (const [i, page] of pages.entries()) {
      const values: bigint[] = []
      for (let i = 0; i < page.length / 2 / 32; i++) {
        values.push(BigInt('0x' + page.slice(64 * i, 64 * (i + 1))))
      }

      const hash = solidityKeccak256(['uint256[]'], [values])
      pageHashes.push(hash)
      await this.contracts.registry.registerContinuousMemoryPage(
        0,
        values,
        0,
        0,
        0
      )
      console.log(`Registered memory page ${i} of ${pages.length} ${hash}`)
    }

    const stateTransitionFact = '0x' + PedersenHash.fake()

    await this.contracts.verifier.emitLogMemoryPagesHashes(
      stateTransitionFact,
      pageHashes
    )
    console.log(`Registered mapping ${stateTransitionFact}`)

    await this.contracts.perpetual.emitLogStateTransitionFact(
      stateTransitionFact
    )
    console.log(`Registered state transition ${stateTransitionFact}`)
  }
}
