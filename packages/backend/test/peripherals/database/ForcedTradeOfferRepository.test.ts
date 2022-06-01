import { AssetId, Hash256, StarkKey, Timestamp } from '@explorer/types'
import { fakeHexString } from '@explorer/types/src/fake'
import { expect } from 'earljs'

import {
  Accepted,
  ForcedTradeOfferRecord,
  ForcedTradeOfferRepository,
} from '../../../src/peripherals/database/ForcedTradeOfferRepository'
import { Logger } from '../../../src/tools/Logger'
import { fakeBigInt, fakeBoolean, fakeInt, fakeTimestamp } from '../../fakes'
import { setupDatabaseTestSuite } from './setup'

function fakeAccepted(accepted?: Partial<Accepted>): Accepted {
  return {
    at: fakeTimestamp(),
    nonce: fakeBigInt(),
    positionIdB: fakeBigInt(),
    premiumCost: fakeBoolean(),
    signature: fakeHexString(32),
    starkKeyB: StarkKey.fake(),
    submissionExpirationTime: fakeBigInt(),
    transactionHash: undefined,
    ...accepted,
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
    accepted: fakeAccepted(offer?.accepted),
    ...offer,
  }
}

function fakeInitialOffer(
  offer?: Partial<Omit<ForcedTradeOfferRecord, 'accepted'>>
) {
  return fakeOffer({ ...offer, accepted: undefined, cancelledAt: undefined })
}

describe(ForcedTradeOfferRepository.name, () => {
  const { knex } = setupDatabaseTestSuite()
  const repository = new ForcedTradeOfferRepository(knex, Logger.SILENT)

  afterEach(() => repository.deleteAll())

  it('adds initial offer', async () => {
    const offer = fakeInitialOffer({ id: undefined })
    const id = await repository.add(offer)
    const actual = await repository.findById(id)
    expect(actual).toEqual({ ...offer, id })
  })

  it('saves accepted offer', async () => {
    const initial = fakeInitialOffer({ id: undefined })
    const id = await repository.add(initial)
    const accepted = {
      ...initial,
      id,
      accepted: fakeAccepted(),
    }
    const updated = await repository.save(accepted)
    expect(updated).toEqual(true)

    const actual = await repository.findById(id)

    expect(actual).toEqual(accepted)
  })

  it('saves submitted offer', async () => {
    const initial = fakeInitialOffer({ id: undefined })
    const id = await repository.add(initial)
    const submitted = {
      ...initial,
      id,
      accepted: {
        ...fakeAccepted(),
        transactionHash: Hash256.fake(),
      },
    }
    const updated = await repository.save(submitted)
    expect(updated).toEqual(true)

    const actual = await repository.findById(id)

    expect(actual).toEqual(submitted)
  })

  async function seedInitialOffers() {
    const id1 = await repository.add(
      fakeInitialOffer({
        syntheticAssetId: AssetId('BTC-10'),
        aIsBuyingSynthetic: true,
        createdAt: Timestamp(1),
      })
    )
    const id2 = await repository.add(
      fakeInitialOffer({
        syntheticAssetId: AssetId('ETH-9'),
        aIsBuyingSynthetic: false,
        createdAt: Timestamp(2),
      })
    )
    const id3 = await repository.add(
      fakeInitialOffer({
        syntheticAssetId: AssetId('AAVE-8'),
        aIsBuyingSynthetic: false,
        createdAt: Timestamp(3),
      })
    )
    const id4 = await repository.add(
      fakeInitialOffer({
        syntheticAssetId: AssetId('AAVE-8'),
        aIsBuyingSynthetic: true,
        createdAt: Timestamp(4),
      })
    )
    const initial = fakeInitialOffer({
      createdAt: Timestamp(5),
    })
    const id5 = await repository.add(initial)
    await repository.save({ ...initial, id: id5, accepted: fakeAccepted() })

    return { id1, id2, id3, id4, id5 }
  }

  async function getIdsAndTotal({
    limit,
    offset,
    assetId,
    type,
  }: {
    limit: number
    offset: number
    assetId?: AssetId
    type?: 'buy' | 'sell'
  }) {
    return Promise.all([
      repository.countInitial({ type, assetId }),
      repository
        .getInitial({ limit, offset, assetId, type })
        .then((os) => os.map((o) => o.id)),
    ])
  }

  it('returns initial offers without filters', async () => {
    const { id1, id2, id3, id4 } = await seedInitialOffers()
    expect(await getIdsAndTotal({ limit: 10, offset: 0 })).toEqual([
      4,
      [id4, id3, id2, id1],
    ])
  })

  it('returns initial offers filtered by asset id', async () => {
    const { id2, id3, id4 } = await seedInitialOffers()
    expect(
      await getIdsAndTotal({ limit: 10, offset: 0, assetId: AssetId('AAVE-8') })
    ).toEqual([2, [id4, id3]])
    expect(
      await getIdsAndTotal({ limit: 10, offset: 0, assetId: AssetId('ETH-9') })
    ).toEqual([1, [id2]])
  })

  it('returns initial offers filtered by type', async () => {
    const { id1, id2, id3, id4 } = await seedInitialOffers()
    expect(
      await getIdsAndTotal({ limit: 10, offset: 0, type: 'sell' })
    ).toEqual([2, [id3, id2]])
    expect(await getIdsAndTotal({ limit: 10, offset: 0, type: 'buy' })).toEqual(
      [2, [id4, id1]]
    )
  })

  it('returns initial offers filtered by asset id and type', async () => {
    const { id4 } = await seedInitialOffers()
    expect(
      await getIdsAndTotal({
        limit: 10,
        offset: 0,
        assetId: AssetId('AAVE-8'),
        type: 'buy',
      })
    ).toEqual([1, [id4]])
  })

  it('returns initial offers filtered and paginated', async () => {
    const { id2 } = await seedInitialOffers()
    expect(await getIdsAndTotal({ limit: 1, offset: 1, type: 'sell' })).toEqual(
      [2, [id2]]
    )
    expect(await getIdsAndTotal({ limit: 1, offset: 2, type: 'sell' })).toEqual(
      [2, []]
    )
    expect(
      await getIdsAndTotal({
        limit: 10,
        offset: 0,
        type: 'buy',
        assetId: AssetId('ETH-9'),
      })
    ).toEqual([0, []])
  })

  it('returns pending offers by position id A', async () => {
    const offer = fakeInitialOffer()
    await repository.add(offer)

    expect(await repository.getPendingByPositionIdA(offer.positionIdA)).toEqual(
      [offer]
    )
  })

  it('deletes all records', async () => {
    await repository.add(fakeInitialOffer())
    await repository.add(fakeOffer())

    await repository.deleteAll()

    const actual = await repository.getInitial({ limit: 10, offset: 0 })
    expect(actual).toEqual([])
  })
})
