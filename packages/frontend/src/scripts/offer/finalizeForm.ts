import { Interface } from '@ethersproject/abi'
import { encodeAssetId } from '@explorer/encoding'
import {
  deserializeFinalizeOfferData,
  FinalizeOfferData,
} from '@explorer/shared'
import { AssetId, EthereumAddress, Hash256 } from '@explorer/types'

import {
  AddressInputName,
  FormId,
  OfferInputName,
  PerpetualAddressInputName,
} from '../../pages/offers/finalize-form'
import { findAndParse } from './findAndParse'

export async function initFinalizeForm() {
  const form = document.querySelector<HTMLFormElement>(`#${FormId}`)
  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const address = findAndParse(form, AddressInputName, EthereumAddress)
    const perpetualAddress = findAndParse(
      form,
      PerpetualAddressInputName,
      EthereumAddress
    )
    const offer = findAndParse(
      form,
      OfferInputName,
      deserializeFinalizeOfferData
    )

    const tx = await sendTransaction(address, perpetualAddress, offer)
    console.log({ tx })
    // TODO: send to backend
  })
}

async function sendTransaction(
  address: EthereumAddress,
  perpetualAddress: EthereumAddress,
  offer: FinalizeOfferData
) {
  const provider = window.ethereum
  if (!provider) {
    return
  }

  const coder = new Interface([
    'function forcedTradeRequest(uint256 starkKeyA, uint256 starkKeyB, uint256 vaultIdA, uint256 vaultIdB, uint256 collateralAssetId, uint256 syntheticAssetId, uint256 amountCollateral, uint256 amountSynthetic, bool aIsBuyingSynthetic, uint256 submissionExpirationTime, uint256 nonce, bytes calldata signature, bool premiumCost)',
  ])

  const data = coder.encodeFunctionData('forcedTradeRequest', [
    offer.starkKeyA,
    offer.starkKeyB,
    offer.positionIdA,
    offer.positionIdB,
    '0x' + encodeAssetId(AssetId.USDC),
    '0x' + encodeAssetId(offer.syntheticAssetId),
    offer.amountCollateral,
    offer.amountSynthetic,
    offer.aIsBuyingSynthetic,
    offer.submissionExpirationTime,
    offer.nonce,
    offer.signature,
    false,
  ])

  const result = await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: address,
        to: perpetualAddress,
        data,
      },
    ],
  })
  return Hash256(result as string)
}
