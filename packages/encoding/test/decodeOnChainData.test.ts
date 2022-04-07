import { expect } from 'earljs'

import { decodeOnChainData } from '../src'
import DECODED_EXAMPLE from './data/decoded-example.json'
import DECODED_FORCED from './data/decoded-forced.json'
import ENCODED_EXAMPLE from './data/encoded-example.json'
import ENCODED_FORCED from './data/encoded-forced.json'

describe('decodeOnChainData', () => {
  it('decodes the example data', () => {
    const decoded = decodeOnChainData(ENCODED_EXAMPLE.map((x) => x.join('')))
    const noBigInt = JSON.parse(
      JSON.stringify(decoded, (k, v) => (typeof v === 'bigint' ? Number(v) : v))
    )
    expect(noBigInt).toEqual(DECODED_EXAMPLE)
  })

  it('decodes data with forced actions', () => {
    const decoded = decodeOnChainData(ENCODED_FORCED.map((x) => x.join('')))
    const noBigInt = JSON.parse(
      JSON.stringify(decoded, (k, v) => (typeof v === 'bigint' ? Number(v) : v))
    )
    expect(noBigInt.forcedActions).toEqual(DECODED_FORCED.forcedActions)
  })
})
