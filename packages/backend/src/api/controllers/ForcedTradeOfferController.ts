import {
  renderForcedTradeOfferDetailsPage,
  renderForcedTradeOffersIndexPage,
} from '@explorer/frontend'
import { AssetId, EthereumAddress, Timestamp } from '@explorer/types'

import {
  Accepted,
  ForcedTradeOfferRecord,
  ForcedTradeOfferRepository,
} from '../../peripherals/database/ForcedTradeOfferRepository'
import { PositionRepository } from '../../peripherals/database/PositionRepository'
import { UserRegistrationEventRepository } from '../../peripherals/database/UserRegistrationEventRepository'
import { ControllerResult } from './ControllerResult'
import {
  validateAcceptSignature,
  validateCancel,
  validateCreate,
} from './utils/ForcedTradeOfferValidators'
import { toForcedTradeOfferEntry } from './utils/toForcedTradeOfferEntry'
import { toForcedTradeOfferHistory } from './utils/toForcedTradeOfferHistory'

export class ForcedTradeOfferController {
  constructor(
    private offerRepository: ForcedTradeOfferRepository,
    private positionRepository: PositionRepository,
    private userRegistrationEventRepository: UserRegistrationEventRepository
  ) {}

  async getOffersIndexPage({
    page,
    perPage,
    assetId,
    type,
    account,
  }: {
    page: number
    perPage: number
    assetId?: AssetId
    type?: 'buy' | 'sell'
    account: EthereumAddress | undefined
  }): Promise<ControllerResult> {
    const [total, offers, assetIds] = await Promise.all([
      this.offerRepository.countInitial({ assetId, type }),
      this.offerRepository.getInitial({
        offset: (page - 1) * perPage,
        limit: perPage,
        assetId,
        type,
      }),
      this.offerRepository.getInitialAssetIds(),
    ])

    const content = renderForcedTradeOffersIndexPage({
      account,
      offers: offers.map(toForcedTradeOfferEntry),
      total,
      assetIds,
      params: { page, perPage, type, assetId },
    })
    return { type: 'success', content }
  }

  private async getAcceptFormData(
    offer: ForcedTradeOfferRecord,
    account: EthereumAddress
  ) {
    const [userPositionId, userEvent] = await Promise.all([
      this.positionRepository.findIdByEthereumAddress(account),
      this.userRegistrationEventRepository.findByEthereumAddress(account),
    ])
    const isAcceptable = !offer.accepted && !offer.cancelledAt
    const shouldRenderForm =
      userEvent &&
      isAcceptable &&
      userPositionId &&
      userPositionId !== offer.positionIdA
    const submissionExpirationTime = BigInt(
      Math.floor((Date.now() + 3 * 24 * 60 * 60 * 1000) / (60 * 60 * 1000))
    )
    if (!shouldRenderForm) {
      return undefined
    }
    return {
      nonce: BigInt(Date.now()),
      positionIdB: userPositionId,
      premiumCost: false,
      starkKeyA: offer.starkKeyA,
      starkKeyB: userEvent.starkKey,
      submissionExpirationTime,
      aIsBuyingSynthetic: offer.aIsBuyingSynthetic,
      address: userEvent.ethAddress,
    }
  }

  async getOfferDetailsPage(
    id: number,
    account: EthereumAddress | undefined
  ): Promise<ControllerResult> {
    const offer = await this.offerRepository.findById(id)
    if (!offer) {
      return {
        type: 'not found',
        content: 'Offer not found.',
      }
    }

    const [userA, userB] = await Promise.all([
      this.userRegistrationEventRepository.findByStarkKey(offer.starkKeyA),
      offer.accepted
        ? this.userRegistrationEventRepository.findByStarkKey(
            offer.accepted.starkKeyB
          )
        : undefined,
    ])
    if (!userA) {
      throw new Error('User A not found')
    }

    const content = renderForcedTradeOfferDetailsPage({
      account,
      history: toForcedTradeOfferHistory(offer),
      offer: {
        type: offer.aIsBuyingSynthetic ? 'buy' : 'sell',
        id,
        addressA: userA.ethAddress,
        positionIdA: offer.positionIdA,
        amountCollateral: offer.amountCollateral,
        amountSynthetic: offer.amountSynthetic,
        syntheticAssetId: offer.syntheticAssetId,
        positionIdB: offer.accepted?.positionIdB,
        addressB: userB?.ethAddress,
      },
      acceptForm: account && (await this.getAcceptFormData(offer, account)),
    })
    return { type: 'success', content }
  }

  async postOffer(
    offer: Omit<ForcedTradeOfferRecord, 'createdAt' | 'id'>,
    signature: string
  ): Promise<ControllerResult> {
    const positionA = await this.positionRepository.findById(offer.positionIdA)
    const userA = await this.userRegistrationEventRepository.findByStarkKey(
      offer.starkKeyA
    )

    if (!positionA || !userA) {
      return { type: 'not found', content: 'Position does not exist.' }
    }
    const requestValid = validateCreate(
      offer,
      positionA,
      signature,
      userA.ethAddress
    )
    if (!requestValid) {
      return { type: 'bad request', content: 'Your offer is invalid.' }
    }

    const id = await this.offerRepository.add({
      createdAt: Timestamp(Date.now()),
      ...offer,
    })

    return { type: 'created', content: { id } }
  }

  async acceptOffer(
    offerId: number,
    accepted: Omit<Accepted, 'at'>
  ): Promise<ControllerResult> {
    const positionB = await this.positionRepository.findById(
      accepted.positionIdB
    )
    const userB = await this.userRegistrationEventRepository.findByStarkKey(
      accepted.starkKeyB
    )
    if (!positionB || !userB) {
      return { type: 'not found', content: 'Position does not exist.' }
    }
    const offer = await this.offerRepository.findById(offerId)
    if (!offer) {
      return { type: 'not found', content: 'Offer does not exist.' }
    }
    if (offer.accepted) {
      return {
        type: 'bad request',
        content: 'Offer already accepted.',
      }
    }
    if (offer.cancelledAt) {
      return {
        type: 'bad request',
        content: 'Offer already cancelled.',
      }
    }
    const signatureValid = validateAcceptSignature(
      offer,
      accepted,
      userB.ethAddress
    )
    if (!signatureValid) {
      return { type: 'bad request', content: 'Invalid signature.' }
    }

    await this.offerRepository.save({
      ...offer,
      accepted: {
        ...accepted,
        at: Timestamp(Date.now()),
      },
    })

    return { type: 'success', content: 'Accept offer was submitted.' }
  }

  async cancelOffer(
    offerId: number,
    signature: string
  ): Promise<ControllerResult> {
    const offer = await this.offerRepository.findById(offerId)
    if (!offer) {
      return {
        type: 'not found',
        content: 'Offer does not exist.',
      }
    }
    if (offer.cancelledAt) {
      return {
        type: 'bad request',
        content: 'Offer already cancelled.',
      }
    }
    if (offer.accepted?.transactionHash) {
      return {
        type: 'bad request',
        content: 'Offer already submitted.',
      }
    }
    const userA = await this.userRegistrationEventRepository.findByStarkKey(
      offer.starkKeyA
    )
    if (!userA) {
      return { type: 'not found', content: 'Position does not exist.' }
    }
    const requestValid = validateCancel(offer.id, userA.ethAddress, signature)
    if (!requestValid) {
      return {
        type: 'bad request',
        content: 'Signature does not match.',
      }
    }

    await this.offerRepository.save({
      ...offer,
      cancelledAt: Timestamp(Date.now()),
    })

    return { type: 'success', content: 'Offer cancelled.' }
  }
}
