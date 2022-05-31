import {
  AcceptedData,
  CreateOfferData,
  toSignableAcceptOffer,
  toSignableCancelOffer,
  toSignableCreateOffer,
} from '@explorer/shared'
import { EthereumAddress } from '@explorer/types'

async function sign(
  method: 'personal_sign' | 'eth_sign',
  address: EthereumAddress,
  toSign: string
) {
  const provider = window.ethereum
  if (!provider) return
  try {
    return (await provider.request({
      method,
      params: [address.toString(), toSign],
    })) as string
  } catch (e) {
    console.error(e)
  }
}

export async function signCreate(
  offer: CreateOfferData,
  address: EthereumAddress
): Promise<string | undefined> {
  const signable = toSignableCreateOffer(offer)
  return sign('personal_sign', address, signable)
}

export async function signAccepted(
  offer: CreateOfferData,
  accepted: AcceptedData,
  address: EthereumAddress
): Promise<string | undefined> {
  const signable = toSignableAcceptOffer(offer, accepted)
  return sign('eth_sign', address, signable)
}

export async function signCancel(
  offerId: number,
  address: EthereumAddress
): Promise<string | undefined> {
  const signable = toSignableCancelOffer(offerId)
  return sign('personal_sign', address, signable)
}
