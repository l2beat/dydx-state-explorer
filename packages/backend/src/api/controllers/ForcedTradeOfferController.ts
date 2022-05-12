import { encodeAssetId } from '@explorer/encoding'
import { AssetId, EthereumAddress, StarkKey, Timestamp } from '@explorer/types'
import {
  recoverAddress,
  solidityKeccak256,
  solidityPack,
} from 'ethers/lib/utils'

import {
  ForcedTradeAcceptedOfferRecord,
  ForcedTradeInitialOfferRecord,
  ForcedTradeOfferRepository,
} from '../../peripherals/database/ForcedTradeOfferRepository'
import {
  PositionRecord,
  StateUpdateRepository,
} from '../../peripherals/database/StateUpdateRepository'
import { UserRegistrationEventRepository } from '../../peripherals/database/UserRegistrationEventRepository'
import { ControllerResult } from './ControllerResult'

export class ForcedTradeOfferController {
  constructor(
    private offerRepository: ForcedTradeOfferRepository,
    private stateUpdateRepository: StateUpdateRepository,
    private userRegistrationEventRepository: UserRegistrationEventRepository
  ) {}

  async postOffer(
    offer: Omit<ForcedTradeInitialOfferRecord, 'createdAt' | 'id'>
  ): Promise<ControllerResult> {
    const positionA = await this.stateUpdateRepository.getPositionById(
      offer.positionIdA
    )

    if (!positionA) {
      return { type: 'not found', content: 'Position does not exist.' }
    }

    const frozenBalance = await this.calculateFrozenBalance(
      offer.starkKeyA,
      offer.aIsBuyingSynthetic ? AssetId.USDC : offer.syntheticAssetId
    )

    const offerValidated = validateInitialOffer(offer, positionA, frozenBalance)

    if (!offerValidated) {
      return { type: 'bad request', content: 'Your offer is invalid.' }
    }

    const createdAt = Timestamp(Date.now())

    const id = await this.offerRepository.addInitialOffer({
      createdAt,
      ...offer,
    })
    return { type: 'created', content: { id } }
  }

  async acceptOffer(
    initialOfferId: number,
    acceptedOffer: Omit<ForcedTradeAcceptedOfferRecord, 'acceptedAt'>
  ): Promise<ControllerResult> {
    const positionB = await this.stateUpdateRepository.getPositionById(
      acceptedOffer.positionIdB
    )
    const userRegistrationEventB =
      await this.userRegistrationEventRepository.findByStarkKey(
        acceptedOffer.starkKeyB
      )

    if (!positionB || !userRegistrationEventB) {
      return { type: 'not found', content: 'Position does not exist.' }
    }
    const initialOffer = await this.offerRepository.findInitialOfferById(
      initialOfferId
    )

    if (!initialOffer) {
      return { type: 'not found', content: 'Offer does not exist.' }
    }

    const accceptOffer = await this.offerRepository.findAcceptedOfferById(
      initialOfferId
    )

    if (accceptOffer) {
      return {
        type: 'bad request',
        content: 'Offer already accepted by a user.',
      }
    }

    const frozenBalance = await this.calculateFrozenBalance(
      acceptedOffer.starkKeyB,
      initialOffer.aIsBuyingSynthetic
        ? initialOffer.syntheticAssetId
        : AssetId.USDC
    )

    const offerValidated = validateAcceptedOffer(
      initialOffer,
      acceptedOffer,
      positionB,
      userRegistrationEventB.ethAddress,
      frozenBalance
    )

    if (!offerValidated) {
      return { type: 'bad request', content: 'Your offer is invalid.' }
    }

    const acceptedAt = Timestamp(Date.now())
    await this.offerRepository.addAcceptedOffer(initialOfferId, {
      acceptedAt,
      ...acceptedOffer,
    })

    return { type: 'success', content: 'Accept offer was submitted.' }
  }

  async calculateFrozenBalance(starkKey: StarkKey, assetId: AssetId) {
    const initialOffers = await this.offerRepository.getInitialOffersByStarkKey(
      starkKey
    )

    const acceptedOffers =
      await this.offerRepository.getAcceptedOffersByStarkKey(starkKey)

    let frozenBalance = 0n

    if (assetId === AssetId.USDC) {
      initialOffers.forEach((offer) => {
        if (offer.aIsBuyingSynthetic) {
          frozenBalance += offer.amountCollateral
        }
      })
      acceptedOffers.forEach((offer) => {
        if (offer.aIsBuyingSynthetic) {
          frozenBalance += offer.amountCollateral
        }
      })
    } else {
      initialOffers.forEach((offer) => {
        if (!offer.aIsBuyingSynthetic && offer.syntheticAssetId === assetId) {
          frozenBalance += offer.amountSynthetic
        }
      })
      acceptedOffers.forEach((offer) => {
        if (offer.aIsBuyingSynthetic && offer.syntheticAssetId === assetId) {
          frozenBalance += offer.amountSynthetic
        }
      })
    }

    return frozenBalance
  }
}

function validateInitialOffer(
  offer: Omit<ForcedTradeInitialOfferRecord, 'createdAt' | 'id'>,
  position: PositionRecord,
  frozenBalance: bigint
) {
  const userIsBuyingSynthetic = offer.aIsBuyingSynthetic

  return validateBalance(offer, position, userIsBuyingSynthetic, frozenBalance)
}

function validateAcceptedOffer(
  initialOffer: ForcedTradeInitialOfferRecord,
  acceptedOffer: Omit<ForcedTradeAcceptedOfferRecord, 'acceptedAt'>,
  position: PositionRecord,
  ethAddressB: EthereumAddress,
  frozenBalance: bigint
) {
  const userIsBuyingSynthetic = !initialOffer.aIsBuyingSynthetic

  if (
    !validateBalance(
      initialOffer,
      position,
      userIsBuyingSynthetic,
      frozenBalance
    )
  ) {
    return false
  }

  return validateSignature(initialOffer, acceptedOffer, ethAddressB)
}

function validateBalance(
  offer: Omit<ForcedTradeInitialOfferRecord, 'createdAt' | 'id'>,
  position: PositionRecord,
  userIsBuyingSynthetic: boolean,
  frozenBalance: bigint
) {
  const { amountCollateral, amountSynthetic, syntheticAssetId } = offer

  const { collateralBalance } = position

  if (
    userIsBuyingSynthetic &&
    amountCollateral <= collateralBalance - frozenBalance
  ) {
    return true
  }

  if (!userIsBuyingSynthetic) {
    const balanceSynthetic = position.balances.find(
      (balance) => balance.assetId === syntheticAssetId
    )?.balance
    if (
      balanceSynthetic &&
      balanceSynthetic - frozenBalance >= amountSynthetic
    ) {
      return true
    }
  }

  return false
}

export function validateSignature(
  initialOffer: Omit<ForcedTradeInitialOfferRecord, 'createdAt' | 'id'>,
  acceptedOffer: Omit<ForcedTradeAcceptedOfferRecord, 'acceptedAt'>,
  ethAddressB: EthereumAddress
): boolean {
  const {
    starkKeyA,
    positionIdA,
    syntheticAssetId,
    amountCollateral,
    amountSynthetic,
    aIsBuyingSynthetic,
  } = initialOffer
  const { starkKeyB, positionIdB, nonce, submissionExpirationTime, signature } =
    acceptedOffer

  try {
    const packedParemeters = solidityPack(
      [
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'bool',
        'uint256',
      ],
      [
        starkKeyA,
        starkKeyB,
        positionIdA,
        positionIdB,
        `0x${encodeAssetId(AssetId.USDC)}`,
        `0x${encodeAssetId(syntheticAssetId)}`,
        amountCollateral,
        amountSynthetic,
        aIsBuyingSynthetic,
        nonce,
      ]
    )

    const actionHash = solidityKeccak256(
      ['string', 'bytes'],
      ['FORCED_TRADE', packedParemeters]
    )

    const signedData = solidityKeccak256(
      ['bytes32', 'uint256'],
      [actionHash, submissionExpirationTime]
    )

    const signer = recoverAddress(signedData, signature)

    return signer === ethAddressB.toString()
  } catch (e) {
    return false
  }
}