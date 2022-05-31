import { AssetId, Hash256, StarkKey } from '@explorer/types'

import { ForcedTradeOfferController } from '../../../src/api/controllers/ForcedTradeOfferController'
import { TransactionSubmitController } from '../../../src/api/controllers/TransactionSubmitController'
import { createForcedTransactionRouter } from '../../../src/api/routers/ForcedTransactionRouter'
import { fakeBigInt, fakeBoolean, fakeInt } from '../../fakes'
import { mock } from '../../mock'
import { createTestApiServer } from '../TestApiServer'

const signature = '0x12345'
const initialData = {
  offer: {
    starkKeyA: StarkKey.fake(),
    positionIdA: 0n.toString(),
    syntheticAssetId: AssetId('ETH-9').toString(),
    amountCollateral: 2000n.toString(),
    amountSynthetic: 1n.toString(),
    aIsBuyingSynthetic: true,
  },
  signature,
}
const acceptedData = {
  starkKeyB: StarkKey.fake(),
  positionIdB: fakeBigInt().toString(),
  submissionExpirationTime: fakeInt().toString(),
  nonce: fakeBigInt().toString(),
  premiumCost: fakeBoolean(),
  signature,
}

function createServer(
  ...params: Parameters<typeof createForcedTransactionRouter>
) {
  const router = createForcedTransactionRouter(...params)
  return createTestApiServer([router])
}

describe('ForcedTransactionRouter', () => {
  describe('/forced/offers', () => {
    it('returns created', async () => {
      const id = 1
      await createServer(
        mock<ForcedTradeOfferController>({
          postOffer: async () => ({ type: 'created', content: { id } }),
        }),
        mock<TransactionSubmitController>()
      )
        .post('/forced/offers')
        .send(initialData)
        .expect(201, { id })
    })
  })

  describe('/forced/offers/:offerId/accept', () => {
    it('returns success', async () => {
      await createServer(
        mock<ForcedTradeOfferController>({
          acceptOffer: async () => ({
            type: 'success',
            content: 'Accept offer was submitted.',
          }),
        }),
        mock<TransactionSubmitController>()
      )
        .post('/forced/offers/1/accept')
        .send(acceptedData)
        .expect(200)
    })
    it('returns not found when offer not found', async () => {
      await createServer(
        mock<ForcedTradeOfferController>({
          acceptOffer: async () => ({
            type: 'not found',
            content: 'Offer does not exist.',
          }),
        }),
        mock<TransactionSubmitController>()
      )
        .post('/forced/offers/1/accept')
        .send(acceptedData)
        .expect(404)
    })
  })

  describe('/forced/offers/:initialOfferId', () => {
    it('returns success', async () => {
      await createServer(
        mock<ForcedTradeOfferController>({
          cancelOffer: async () => ({
            type: 'success',
            content: 'Offer cancelled.',
          }),
        }),
        mock<TransactionSubmitController>()
      )
        .post('/forced/offers/1/cancel')
        .send({ signature })
        .expect(200)
    })

    it('returns bad request for invalid input', async () => {
      await createServer(
        mock<ForcedTradeOfferController>(),
        mock<TransactionSubmitController>()
      )
        .post('/forced/offers/1/cancel')
        .send({
          signature: 123,
        })
        .expect(400)
    })
  })

  describe('POST /forced/exits', () => {
    it('returns success', async () => {
      const hash = Hash256.fake()
      await createServer(
        mock<ForcedTradeOfferController>(),
        mock<TransactionSubmitController>({
          submitForcedExit: async () => ({
            type: 'created',
            content: { id: hash },
          }),
        })
      )
        .post('/forced/exits')
        .send({ hash })
        .expect(201)
    })

    it('returns bad request for invalid input', async () => {
      await createServer(
        mock<ForcedTradeOfferController>(),
        mock<TransactionSubmitController>()
      )
        .post('/forced/exits')
        .send({ hash: 123 })
        .expect(400)
    })
  })
})
