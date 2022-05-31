import {
  ForcedAction,
  FundingEntry,
  OraclePrice,
  PositionUpdate,
} from '@explorer/encoding'
import { AssetId, EthereumAddress, StarkKey, Timestamp } from '@explorer/types'

import { StateUpdater } from './StateUpdater'

interface AssetDefinition {
  assetId: AssetId
  priceUSDCents: bigint
}

export function getPrice(assetId: AssetId, priceUSDCents: bigint) {
  const usdc = priceUSDCents * 10_000n
  const fixed32 = usdc * 2n ** 32n
  const assetUnit = 10n ** BigInt(AssetId.decimals(assetId))
  return fixed32 / assetUnit
}

export class Simulation {
  private prices: OraclePrice[] = []
  private oldPositions: PositionUpdate[] = []
  private lastFundingTimestamp = Timestamp(Date.now())
  private newFunding: FundingEntry[] = [
    { indices: [], timestamp: this.lastFundingTimestamp },
  ]
  private newPositions: PositionUpdate[] = []
  private newForcedActions: ForcedAction[] = []

  constructor(private stateUpdater: StateUpdater, assets: AssetDefinition[]) {
    this.prices = assets.map(({ assetId, priceUSDCents }) => ({
      assetId,
      price: getPrice(assetId, priceUSDCents),
    }))
  }

  queueForcedAction(action: ForcedAction) {
    this.newForcedActions.push(action)
    if (action.type === 'withdrawal') {
      console.log('Withdrawal queued', action.publicKey)
    } else {
      console.log('Trade queued', action.publicKeyA)
    }
  }

  async update() {
    if (this.oldPositions.length !== 0) {
      const updateCount = randomInt(1, 3)
      for (let i = 0; i < updateCount; i++) {
        await this.queueUpdate()
      }
    }

    const positionDiff = this.newPositions.flatMap((position) => {
      const old = this.oldPositions.find(
        (x) => x.positionId === position.positionId
      )
      if (!old) {
        return [position]
      }
      const diff: PositionUpdate = {
        positionId: position.positionId,
        collateralBalance: position.collateralBalance,
        fundingTimestamp: position.fundingTimestamp,
        publicKey: position.publicKey,
        balances: position.balances.filter(
          (x) =>
            x.balance !==
            old.balances.find((y) => y.assetId === x.assetId)?.balance
        ),
      }
      if (
        old.collateralBalance === position.collateralBalance &&
        old.fundingTimestamp === position.fundingTimestamp &&
        diff.balances.length === 0
      ) {
        return []
      } else {
        return [diff]
      }
    })

    this.oldPositions = this.newPositions.map((x) => ({
      ...x,
      balances: x.balances.map((y) => ({ ...y })),
    }))

    await this.stateUpdater.update({
      funding: this.newFunding,
      forcedActions: this.newForcedActions,
      positions: positionDiff,
      prices: this.prices,
    })

    this.newFunding = []
    this.newForcedActions = []
  }

  private async queueUpdate() {
    this.addFundingEntry()
    this.fluctuatePrices()

    const depositCount = randomInt(0, 3)
    for (let i = 0; i < depositCount; i++) {
      await this.addUser(EthereumAddress.fake(), StarkKey.fake())
    }

    const tradeCount = randomInt(
      Math.floor(this.newPositions.length / 4),
      this.newPositions.length * 2
    )
    for (let i = 0; i < tradeCount; i++) {
      this.addTrade()
    }
  }

  private addFundingEntry() {
    this.lastFundingTimestamp = randomNextTimestamp(this.lastFundingTimestamp)

    this.newFunding.push({
      timestamp: this.lastFundingTimestamp,
      indices: this.prices.map(({ assetId }) => ({
        assetId,
        value: randomBigInt(-1_000_000n, 1_000_000n),
      })),
    })
  }

  private fluctuatePrices() {
    this.prices = this.prices.map(({ assetId, price }) => ({
      assetId,
      price: (price * randomBigInt(95n, 106n)) / 100n,
    }))
  }

  private addTrade() {
    const position = randomChoice(this.newPositions)
    const { assetId, price } = randomChoice(this.prices)

    const unitSize = 10n ** BigInt(AssetId.decimals(assetId))
    const units = randomBigInt(-10_000n, 10_000n)
    const subUnits = randomBigInt(0n, unitSize)
    const syntheticDiff = units * unitSize + subUnits
    const collateralDiff = -(syntheticDiff * price) / 2n ** 32n

    position.collateralBalance += collateralDiff
    const balance = position.balances.find((x) => x.assetId === assetId)
    if (balance) {
      balance.balance += syntheticDiff
    } else {
      position.balances.push({ assetId, balance: syntheticDiff })
    }

    position.fundingTimestamp = this.lastFundingTimestamp
  }

  async addUser(address: EthereumAddress, starkKey: StarkKey) {
    await this.stateUpdater.registerUser(address, starkKey)
    let deposit = positionAfterDeposit(starkKey, this.lastFundingTimestamp)
    while (this.newPositions.some((x) => x.positionId === deposit.positionId)) {
      deposit = positionAfterDeposit(starkKey, this.lastFundingTimestamp)
    }
    this.newPositions.push(deposit)
  }
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * Number(max - min))
}

function randomBigInt(min: bigint, max: bigint) {
  return min + BigInt(Math.floor(Math.random() * Number(max - min)))
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function randomNextTimestamp(last: Timestamp) {
  const lastSeconds = Math.floor(+last / 1000)
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (nowSeconds <= lastSeconds) {
    return Timestamp.fromSeconds(lastSeconds + 1)
  } else {
    return Timestamp.fromSeconds(
      lastSeconds +
        1 +
        Math.floor(Math.random() * (nowSeconds - lastSeconds - 1))
    )
  }
}

function positionAfterDeposit(
  publicKey: StarkKey,
  fundingTimestamp: Timestamp
): PositionUpdate {
  return {
    publicKey,
    positionId: randomBigInt(1n, 10_000n),
    collateralBalance: randomBigInt(1_000n, 100_000n) * 1_000_000n,
    fundingTimestamp,
    balances: [],
  }
}
