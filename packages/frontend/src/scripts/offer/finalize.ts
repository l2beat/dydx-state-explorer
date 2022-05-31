import { Interface } from '@ethersproject/abi'
import { encodeAssetId } from '@explorer/encoding'
import { AcceptedOfferData, CreateOfferData } from '@explorer/shared'
import { AssetId, EthereumAddress } from '@explorer/types'

type MatchedOfferData = CreateOfferData &
  AcceptedOfferData & { signature: string }

export async function finalize(
  account: EthereumAddress,
  perpetualAddress: EthereumAddress,
  offer: MatchedOfferData
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
    encodeAssetId(AssetId.USDC),
    encodeAssetId(offer.syntheticAssetId),
    offer.amountCollateral,
    offer.amountSynthetic,
    offer.aIsBuyingSynthetic,
    offer.submissionExpirationTime,
    offer.nonce,
    offer.signature,
    false,
  ])

  await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: account,
        to: perpetualAddress,
        data,
      },
    ],
  })
}
