import { providers, utils } from 'ethers'
import { getGpsVerifiers } from './getGpsVerifiers'

const PERPETUAL_ADDRESS = '0xD54f502e184B6B739d7D27a6410a67dc462D69c8'

const PERPETUAL_ABI = new utils.Interface([
  'event LogStateTransitionFact(bytes32 stateTransitionFact)',
])

export async function getStateTransitionFacts(blockHash: string) {
  const provider = new providers.AlchemyProvider()
  const logs = await provider.getLogs({
    address: PERPETUAL_ADDRESS,
    blockHash,
    topics: [PERPETUAL_ABI.getEventTopic('LogStateTransitionFact')],
  })
  const events = logs.map((log) => PERPETUAL_ABI.parseLog(log))
  const facts = events.map((event) => event.args.stateTransitionFact)
  const verifiers = await getGpsVerifiers(provider)
  console.log(verifiers)
}

const GPS_VERIFIER_ABI = new utils.Interface([
  'event LogMemoryPagesHashes(bytes32 factHash, bytes32[] pagesHashes)',
])
