import { toSignableCancelOffer, toSignableCreateOffer } from '@explorer/shared'
import { EthereumAddress, Hash256, Timestamp } from '@explorer/types'
import { expect } from 'earljs'
import { Wallet } from 'ethers'

import { ForcedTradeOfferController } from '../../../src/api/controllers/ForcedTradeOfferController'
import { ForcedTradeOfferRepository } from '../../../src/peripherals/database/ForcedTradeOfferRepository'
import { PositionRepository } from '../../../src/peripherals/database/PositionRepository'
import { UserRegistrationEventRepository } from '../../../src/peripherals/database/UserRegistrationEventRepository'
import { mock } from '../../mock'
import * as tradeMock from './utils/ForcedTradeOfferMockData'

describe(ForcedTradeOfferController.name, async () => {
  const stateUpdateId = 1
  const positionA = {
    positionId: tradeMock.offer.positionIdA,
    publicKey: tradeMock.offer.starkKeyA,
    collateralBalance: tradeMock.offer.amountCollateral,
    balances: [],
    stateUpdateId,
  }
  const positionB = {
    publicKey: tradeMock.accepted.starkKeyB,
    positionId: tradeMock.accepted.positionIdB,
    collateralBalance: 0n,
    balances: [
      {
        assetId: tradeMock.offer.syntheticAssetId,
        balance: tradeMock.offer.amountSynthetic,
      },
    ],
    stateUpdateId,
  }
  const wallet = Wallet.createRandom()
  const addressA = EthereumAddress(wallet.address)
  const userA = {
    id: 1,
    blockNumber: 1,
    starkKey: tradeMock.offer.starkKeyA,
    ethAddress: addressA,
  }
  const userB = {
    id: 2,
    blockNumber: 1,
    starkKey: tradeMock.accepted.starkKeyB,
    ethAddress: tradeMock.addressB,
  }
  const invalidSignature = '0x12345'

  describe(ForcedTradeOfferController.prototype.postOffer.name, () => {
    it('blocks invalid signature', async () => {
      const offerRepository = mock<ForcedTradeOfferRepository>({
        add: async () => 1,
      })
      const positionRepository = mock<PositionRepository>({
        findById: async () => positionA,
      })
      const userRegistrationEventRepository =
        mock<UserRegistrationEventRepository>({
          findByStarkKey: async () => userA,
        })
      const controller = new ForcedTradeOfferController(
        offerRepository,
        positionRepository,
        userRegistrationEventRepository
      )

      expect(
        await controller.postOffer(tradeMock.offer, invalidSignature)
      ).toEqual({
        type: 'bad request',
        content: 'Your offer is invalid.',
      })
    })

    it('blocks missing position', async () => {
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>(),
        mock<PositionRepository>({
          findById: async () => undefined,
        }),
        mock<UserRegistrationEventRepository>({
          findByStarkKey: async () => userA,
        })
      )

      expect(
        await controller.postOffer(tradeMock.offer, invalidSignature)
      ).toEqual({
        type: 'not found',
        content: 'Position does not exist.',
      })
    })

    it('blocks missing user', async () => {
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>(),
        mock<PositionRepository>({
          findById: async () => positionA,
        }),
        mock<UserRegistrationEventRepository>({
          findByStarkKey: async () => undefined,
        })
      )

      expect(
        await controller.postOffer(tradeMock.offer, invalidSignature)
      ).toEqual({
        type: 'not found',
        content: 'Position does not exist.',
      })
    })

    it('blocks invalid balance', async () => {
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>(),
        mock<PositionRepository>({
          findById: async () => ({ ...positionA, amountCollateral: 0n }),
        }),
        mock<UserRegistrationEventRepository>({
          findByStarkKey: async () => userA,
        })
      )

      expect(
        await controller.postOffer(tradeMock.offer, invalidSignature)
      ).toEqual({
        type: 'bad request',
        content: 'Your offer is invalid.',
      })
    })

    it('creates offer', async () => {
      const id = 1
      const offerRepository = mock<ForcedTradeOfferRepository>({
        add: async () => id,
      })
      const positionRepository = mock<PositionRepository>({
        findById: async () => positionA,
      })
      const userRegistrationEventRepository =
        mock<UserRegistrationEventRepository>({
          findByStarkKey: async () => userA,
        })
      const controller = new ForcedTradeOfferController(
        offerRepository,
        positionRepository,
        userRegistrationEventRepository
      )

      const request = toSignableCreateOffer(tradeMock.offer)
      const signature = await wallet.signMessage(request)
      expect(await controller.postOffer(tradeMock.offer, signature)).toEqual({
        type: 'created',
        content: { id },
      })
    })
  })

  describe(ForcedTradeOfferController.prototype.acceptOffer.name, () => {
    it('blocks missing position', async () => {
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>({}),
        mock<PositionRepository>({
          findById: async () => undefined,
        }),
        mock<UserRegistrationEventRepository>({
          findByStarkKey: async () => userA,
        })
      )

      expect(await controller.acceptOffer(1, tradeMock.accepted)).toEqual({
        type: 'not found',
        content: 'Position does not exist.',
      })
    })

    it('blocks missing user', async () => {
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>({}),
        mock<PositionRepository>({
          findById: async () => positionA,
        }),
        mock<UserRegistrationEventRepository>({
          findByStarkKey: async () => undefined,
        })
      )

      expect(await controller.acceptOffer(1, tradeMock.accepted)).toEqual({
        type: 'not found',
        content: 'Position does not exist.',
      })
    })

    it('blocks missing offer', async () => {
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>({
          findById: async () => undefined,
        }),
        mock<PositionRepository>({
          findById: async () => positionA,
        }),
        mock<UserRegistrationEventRepository>({
          findByStarkKey: async () => userA,
        })
      )

      expect(await controller.acceptOffer(1, tradeMock.accepted)).toEqual({
        type: 'not found',
        content: 'Offer does not exist.',
      })
    })

    it('blocks accepted offer', async () => {
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>({
          findById: async () => ({
            id: 1,
            createdAt: Timestamp(Date.now() - 2000),
            ...tradeMock.offer,
            accepted: {
              ...tradeMock.accepted,
              at: Timestamp(Date.now() - 1000),
            },
          }),
        }),
        mock<PositionRepository>({
          findById: async () => positionA,
        }),
        mock<UserRegistrationEventRepository>({
          findByStarkKey: async () => userA,
        })
      )

      expect(await controller.acceptOffer(1, tradeMock.accepted)).toEqual({
        type: 'bad request',
        content: 'Offer already accepted.',
      })
    })

    it('blocks cancelled offer', async () => {
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>({
          findById: async () => ({
            id: 1,
            createdAt: Timestamp(Date.now() - 2000),
            ...tradeMock.offer,
            cancelledAt: Timestamp(Date.now() - 1000),
          }),
        }),
        mock<PositionRepository>({
          findById: async () => positionA,
        }),
        mock<UserRegistrationEventRepository>({
          findByStarkKey: async () => userA,
        })
      )

      expect(await controller.acceptOffer(1, tradeMock.accepted)).toEqual({
        type: 'bad request',
        content: 'Offer already cancelled.',
      })
    })

    it('blocks invalid signature', async () => {
      const id = 1
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>({
          add: async () => id,
          findById: async () => ({
            ...tradeMock.offer,
            id,
            createdAt: Timestamp(Date.now()),
          }),
        }),
        mock<PositionRepository>({
          findById: async (id) => {
            if (id === positionA.positionId) {
              return positionA
            }
            if (id === positionB.positionId) {
              return { ...positionB, balances: [] }
            }
          },
        }),
        mock<UserRegistrationEventRepository>({
          findByStarkKey: async (starkKey) => {
            if (starkKey === userA.starkKey) {
              return userA
            }
            if (starkKey === userB.starkKey) {
              return userB
            }
          },
        })
      )

      expect(
        await controller.acceptOffer(id, {
          ...tradeMock.accepted,
          signature: 'invalid',
        })
      ).toEqual({
        type: 'bad request',
        content: 'Invalid signature.',
      })
    })

    it('accepts offer', async () => {
      const id = 1
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>({
          add: async () => id,
          findById: async () => ({
            id,
            createdAt: Timestamp(Date.now()),
            ...tradeMock.offer,
          }),
          save: async () => true,
        }),
        mock<PositionRepository>({
          findById: async (id) => {
            if (id === positionA.positionId) {
              return positionA
            }
            if (id === positionB.positionId) {
              return positionB
            }
          },
        }),
        mock<UserRegistrationEventRepository>({
          findByStarkKey: async (starkKey) => {
            if (starkKey === userA.starkKey) {
              return userA
            }
            if (starkKey === userB.starkKey) {
              return userB
            }
          },
        })
      )

      expect(await controller.acceptOffer(id, tradeMock.accepted)).toEqual({
        type: 'success',
        content: 'Accept offer was submitted.',
      })
    })
  })

  describe(ForcedTradeOfferController.prototype.cancelOffer.name, () => {
    const id = 1
    const request = toSignableCancelOffer(id)
    const initial = {
      id,
      ...tradeMock.offer,
      createdAt: Timestamp(Date.now() - 1000),
      accepted: undefined,
    }
    const accepted = {
      ...initial,
      accepted: {
        ...tradeMock.accepted,
        at: Timestamp(Date.now() - 500),
      },
    }

    it('blocks missing offer', async () => {
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>({
          findById: async () => undefined,
        }),
        mock<PositionRepository>(),
        mock<UserRegistrationEventRepository>()
      )

      expect(await controller.cancelOffer(1, '123')).toEqual({
        type: 'not found',
        content: 'Offer does not exist.',
      })
    })

    it('blocks cancelled offer', async () => {
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>({
          findById: async () => ({
            ...initial,
            cancelledAt: Timestamp(Date.now()),
          }),
        }),
        mock<PositionRepository>(),
        mock<UserRegistrationEventRepository>()
      )

      const signature = await wallet.signMessage(request)
      expect(await controller.cancelOffer(id, signature)).toEqual({
        type: 'bad request',
        content: 'Offer already cancelled.',
      })
    })

    it('blocks submitted offer', async () => {
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>({
          findById: async () => ({
            ...accepted,
            accepted: {
              ...accepted.accepted,
              transactionHash: Hash256.fake(),
            },
          }),
        }),
        mock<PositionRepository>(),
        mock<UserRegistrationEventRepository>()
      )

      const signature = await wallet.signMessage(request)
      expect(await controller.cancelOffer(id, signature)).toEqual({
        type: 'bad request',
        content: 'Offer already submitted.',
      })
    })

    it('blocks missing position', async () => {
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>({
          findById: async () => accepted,
        }),
        mock<PositionRepository>(),
        mock<UserRegistrationEventRepository>({
          findByStarkKey: async () => undefined,
        })
      )

      const signature = await wallet.signMessage(request)
      expect(await controller.cancelOffer(id, signature)).toEqual({
        type: 'not found',
        content: 'Position does not exist.',
      })
    })

    it('blocks invalid signature', async () => {
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>({
          findById: async () => accepted,
        }),
        mock<PositionRepository>(),
        mock<UserRegistrationEventRepository>({
          findByStarkKey: async () => userA,
        })
      )

      const signature = await wallet.signMessage(request + 'tampered')
      expect(await controller.cancelOffer(id, signature)).toEqual({
        type: 'bad request',
        content: 'Signature does not match.',
      })
    })

    it('cancels offer', async () => {
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>({
          findById: async () => accepted,
          save: async () => true,
        }),
        mock<PositionRepository>(),
        mock<UserRegistrationEventRepository>({
          findByStarkKey: async () => ({
            ...userA,
            ethAddress: addressA,
          }),
        })
      )
      const signature = await wallet.signMessage(request)

      expect(await controller.cancelOffer(id, signature)).toEqual({
        type: 'success',
        content: 'Offer cancelled.',
      })
    })
  })
})
