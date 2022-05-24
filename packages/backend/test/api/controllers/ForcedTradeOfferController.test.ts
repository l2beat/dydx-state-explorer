import { getCancelRequest, getCreateRequest } from '@explorer/shared'
import { EthereumAddress, Hash256, Timestamp } from '@explorer/types'
import { expect } from 'earljs'
import { Wallet } from 'ethers'

import { ForcedTradeOfferController } from '../../../src/api/controllers/ForcedTradeOfferController'
import { ForcedTradeOfferRepository } from '../../../src/peripherals/database/ForcedTradeOfferRepository'
import { PositionRepository } from '../../../src/peripherals/database/PositionRepository'
import { UserRegistrationEventRepository } from '../../../src/peripherals/database/UserRegistrationEventRepository'
import { mock } from '../../mock'
import { accepted, addressB, offer } from './utils/ForcedTradeOfferMockData'

describe(ForcedTradeOfferController.name, async () => {
  const stateUpdateId = 1
  const positionA = {
    positionId: offer.positionIdA,
    publicKey: offer.starkKeyA,
    collateralBalance: offer.amountCollateral,
    balances: [],
    stateUpdateId,
  }
  const positionB = {
    publicKey: accepted.starkKeyB,
    positionId: accepted.positionIdB,
    collateralBalance: 0n,
    balances: [
      {
        assetId: offer.syntheticAssetId,
        balance: offer.amountSynthetic,
      },
    ],
    stateUpdateId,
  }
  const wallet = Wallet.createRandom()
  const addressA = EthereumAddress(wallet.address)
  const userA = {
    id: 1,
    blockNumber: 1,
    starkKey: offer.starkKeyA,
    ethAddress: addressA,
  }
  const userB = {
    id: 2,
    blockNumber: 1,
    starkKey: accepted.starkKeyB,
    ethAddress: addressB,
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

      expect(await controller.postOffer(offer, invalidSignature)).toEqual({
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

      expect(await controller.postOffer(offer, invalidSignature)).toEqual({
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

      expect(await controller.postOffer(offer, invalidSignature)).toEqual({
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

      expect(await controller.postOffer(offer, invalidSignature)).toEqual({
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

      const request = getCreateRequest(offer)
      const signature = await wallet.signMessage(request)
      expect(await controller.postOffer(offer, signature)).toEqual({
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

      expect(await controller.acceptOffer(1, accepted)).toEqual({
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

      expect(await controller.acceptOffer(1, accepted)).toEqual({
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

      expect(await controller.acceptOffer(1, accepted)).toEqual({
        type: 'not found',
        content: 'Offer does not exist.',
      })
    })

    it('blocks invalid balance', async () => {
      const id = 1
      const controller = new ForcedTradeOfferController(
        mock<ForcedTradeOfferRepository>({
          add: async () => id,
          findById: async () => ({
            ...offer,
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

      expect(await controller.acceptOffer(id, accepted)).toEqual({
        type: 'bad request',
        content: 'Your offer is invalid.',
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
            ...offer,
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

      expect(await controller.acceptOffer(id, accepted)).toEqual({
        type: 'success',
        content: 'Accept offer was submitted.',
      })
    })
  })

  describe(ForcedTradeOfferController.prototype.cancelOffer.name, () => {
    const id = 1
    const wallet = Wallet.createRandom()
    const address = EthereumAddress(wallet.address)
    const request = getCancelRequest(id)
    const initial = {
      id,
      ...offer,
      createdAt: Timestamp(Date.now() - 1000),
      accepted: undefined,
    }
    const accepted = {
      ...initial,
      accepted: {
        ...accept,
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

      const signature = await wallet.signMessage(request)
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
            ethAddress: address,
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
