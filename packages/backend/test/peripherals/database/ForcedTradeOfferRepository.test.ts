import { AssetId, StarkKey, Timestamp } from '@explorer/types'
import { fakeHexString } from '@explorer/types/src/fake'
import { expect } from 'earljs'

import {
  AcceptedData,
  ForcedTradeOfferRecord,
  ForcedTradeOfferRepository,
} from '../../../src/peripherals/database/ForcedTradeOfferRepository'
import { Logger } from '../../../src/tools/Logger'
import { fakeBigInt, fakeBoolean, fakeInt, fakeTimestamp } from '../../fakes'
import { setupDatabaseTestSuite } from './setup'

function fakeAcceptedData(data?: Partial<AcceptedData>): AcceptedData {
  return {
    at: fakeTimestamp(),
    nonce: fakeBigInt(),
    positionIdB: fakeBigInt(),
    premiumCost: fakeBoolean(),
    signature: fakeHexString(32),
    starkKeyB: StarkKey.fake(),
    submissionExpirationTime: fakeBigInt(),
    ...data,
  }
}

function fakeOffer(
  offer?: Partial<ForcedTradeOfferRecord>
): ForcedTradeOfferRecord {
  return {
    id: fakeInt(),
    createdAt: fakeTimestamp(),
    starkKeyA: StarkKey.fake(),
    positionIdA: fakeBigInt(),
    syntheticAssetId: AssetId('ETH-9'),
    amountCollateral: fakeBigInt(),
    amountSynthetic: fakeBigInt(),
    aIsBuyingSynthetic: true,
    accepted: fakeAcceptedData(offer?.accepted),
    ...offer,
  }
}

describe(ForcedTradeOfferRepository.name, () => {
  const { knex } = setupDatabaseTestSuite()
  const repository = new ForcedTradeOfferRepository(knex, Logger.SILENT)

  afterEach(() => repository.deleteAll())

  it('adds initial offer', async () => {
    const offer = fakeOffer({ id: undefined, accepted: undefined })
    const id = await repository.add(offer)
    const actual = await repository.findById(id)
    expect(actual).toEqual({ ...offer, id })
  })

  it('saves accepted offer', async () => {
    const initial = fakeOffer({ id: undefined, accepted: undefined })
    const id = await repository.add(initial)
    const accepted = {
      ...initial,
      id,
      accepted: fakeAcceptedData(),
    }
    const updated = await repository.save(accepted)
    expect(updated).toEqual(true)

    const actual = await repository.findById(id)

    expect(actual).toEqual(accepted)
  })

  it('deletes all records', async () => {
    await repository.add(fakeOffer({ accepted: undefined }))
    await repository.add(fakeOffer())

    await repository.deleteAll()

    const actual = await repository.getLatest({ limit: 10, offset: 0 })
    expect(actual).toEqual([])
  })

  it('returns latest offers', async () => {
    await repository.add(fakeOffer({ createdAt: Timestamp(3) }))
    const id2 = await repository.add(fakeOffer({ createdAt: Timestamp(2) }))
    const id3 = await repository.add(fakeOffer({ createdAt: Timestamp(1) }))

    const latest = await repository.getLatest({ limit: 10, offset: 1 })

    expect(latest.map((o) => o.id)).toEqual([id2, id3])
  })
})
