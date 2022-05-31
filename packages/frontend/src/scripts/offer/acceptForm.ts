import {
  deserializeAcceptedData,
  serializeAcceptOfferBody,
} from '@explorer/shared'
import { deserializeCreateOfferData } from '@explorer/shared/build/src/CreateOfferData'
import { EthereumAddress } from '@explorer/types'

import {
  AcceptedInputName,
  AddressInputName,
  FormId,
  OfferInputName,
} from '../../pages/offers/accept-form'
import { signAccepted } from './sign'

export function initAcceptOfferForm() {
  const form = document.querySelector<HTMLFormElement>(`#${FormId}`)
  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const address = findAndParse(form, AddressInputName, EthereumAddress)
    const offer = findAndParse(form, OfferInputName, deserializeCreateOfferData)
    const accepted = findAndParse(
      form,
      AcceptedInputName,
      deserializeAcceptedData
    )

    const signature = await signAccepted(offer, accepted, address)
    if (!signature) {
      throw new Error('Could not create a signature for accept form')
    }

    await fetch(form.action, {
      method: form.method,
      headers: { 'Content-Type': 'application/json' },
      body: serializeAcceptOfferBody({
        ...accepted,
        signature,
      }),
    })

    window.location.reload()
  })
}

function findAndParse<T>(
  form: HTMLFormElement,
  name: string,
  parse: (text: string) => T
): T {
  const value = form.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value
  if (!value) {
    throw new Error(`Element ${name} not found in ${FormId} form`)
  }
  return parse(value)
}
