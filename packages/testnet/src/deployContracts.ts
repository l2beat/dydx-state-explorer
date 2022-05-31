import { Wallet } from 'ethers'

import {
  Perpetual__factory,
  Registry__factory,
  Verifier__factory,
} from '../build/typechain'

type ContractsPromise = ReturnType<typeof deployContracts>
export type Contracts = ContractsPromise extends Promise<infer T> ? T : never

export async function deployContracts(deployer: Wallet) {
  const registryFactory = new Registry__factory(deployer)
  const registry = await registryFactory.deploy()

  console.log('Registry', registry.address)

  const verifierFactory = new Verifier__factory(deployer)
  const verifier = await verifierFactory.deploy()

  console.log('Verifier', verifier.address)

  const perpetualFactory = new Perpetual__factory(deployer)
  const perpetual = await perpetualFactory.deploy()

  console.log('Perpetual', perpetual.address)

  return {
    registry,
    verifier,
    perpetual,
  }
}
