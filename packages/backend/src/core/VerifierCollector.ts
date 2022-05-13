import { EthereumAddress } from '@explorer/types'
import { utils } from 'ethers'
import { AbiCoder } from 'ethers/lib/utils'
import { partition } from 'lodash'

import { BlockRange } from '../model/BlockRange'
import {
  VerifierEventRecord,
  VerifierEventRepository,
} from '../peripherals/database/VerifierEventRepository'
import { PROXY_ADDRESS } from '../peripherals/ethereum/addresses'
import { EthereumClient } from '../peripherals/ethereum/EthereumClient'
import { BlockNumber } from '../peripherals/ethereum/types'

const PROXY_ABI = new utils.Interface([
  'event ImplementationAdded(address indexed implementation, bytes initializer, bool finalize)',
  'event Upgraded(address indexed implementation)',
])

const Upgraded = PROXY_ABI.getEventTopic('Upgraded')
const ImplementationAdded = PROXY_ABI.getEventTopic('ImplementationAdded')

const HARDCODED_VERIFIERS = [
  EthereumAddress('0xB1EDA32c467569fbDC8C3E041C81825D76b32b84'),
  EthereumAddress('0x894c4a12548FB18EaA48cF34f9Cd874Fc08b7FC3'),
]

export class VerifierCollector {
  constructor(
    private readonly ethereumClient: EthereumClient,
    private readonly verifierEventRepository: VerifierEventRepository,
    private readonly hardcodedAddresses: EthereumAddress[] = HARDCODED_VERIFIERS
  ) {}

  /**
   * Saves new `Upgraded` and `ImplementationAdded` events to the database,
   * and returns verifier addresses derived from both the old and new events.
   */
  async collect(blockRange: BlockRange): Promise<EthereumAddress[]> {
    const oldEvents = this.verifierEventRepository.getAll()
    const newEvents = await this.getEvents(blockRange)
    const savingNewEventsToDb = this.verifierEventRepository.addMany(newEvents)

    const events = [...(await oldEvents), ...newEvents]
    const [upgraded, added] = partition(events, (e) => e.name === 'Upgraded')

    added.sort(byBlockNumberDescending)

    await savingNewEventsToDb

    const computed = computeVerifiersFromEvents(added, upgraded)

    return computed
      .concat(this.hardcodedAddresses)
      .filter((x, i, a) => a.indexOf(x) === i)
  }

  async discardAfter(lastToKeep: BlockNumber) {
    await this.verifierEventRepository.deleteAfter(lastToKeep)
  }

  private async getEvents(blockRange: BlockRange) {
    const logs = await this.ethereumClient.getLogsInRange(blockRange, {
      address: PROXY_ADDRESS,
      topics: [[ImplementationAdded, Upgraded]],
    })
    return logs.map((log): Omit<VerifierEventRecord, 'id'> => {
      const event = PROXY_ABI.parseLog(log)
      return {
        name: event.name as 'ImplementationAdded' | 'Upgraded',
        blockNumber: log.blockNumber,
        implementation: event.args.implementation,
        initializer: event.args.initializer,
      }
    })
  }
}

/**
 * ImplementationAdded and Upgraded events are the source of truth for verifiers
 * which addresses are found in the `upgradeEvent.initializer` field.
 */
function computeVerifiersFromEvents(
  added: Omit<VerifierEventRecord, 'id'>[],
  upgraded: Omit<VerifierEventRecord, 'id'>[]
): EthereumAddress[] {
  return upgraded
    .map(
      // get closest preceding added event with the same implementation
      (u) =>
        added.find(
          (a) =>
            a.implementation === u.implementation &&
            a.blockNumber <= u.blockNumber
        )
    )
    .flatMap((x) => (x?.initializer ? [decodeAddress(x.initializer)] : []))
}

function decodeAddress(data: string): EthereumAddress {
  const decoded = new AbiCoder().decode(['address'], data)[0]
  return EthereumAddress(decoded)
}

function byBlockNumberDescending(
  a: { blockNumber: number },
  b: { blockNumber: number }
) {
  return b.blockNumber - a.blockNumber
}
