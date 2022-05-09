import { AssetId, EthereumAddress, StarkKey } from '@explorer/types'
import { expect } from 'earljs'
import {
  getInitialState,
  nextFormState,
} from '../../../src/scripts/transaction/state'
import { FormAction } from '../../../src/scripts/transaction/types'

describe(nextFormState.name, () => {
  const INITIAL_STATE = getInitialState(
    {
      positionId: 123n,
      account: EthereumAddress.fake(),
      publicKey: StarkKey.fake(),
      selectedAsset: AssetId('ETH-9'),
      assets: [
        {
          assetId: AssetId('USDC-6'),
          balance: 69420_654321n,
          priceUSDCents: 100n,
          totalUSDCents: 69420_65n,
        },
        {
          assetId: AssetId('ETH-9'),
          balance: 21_370000000n,
          priceUSDCents: 2839_39n,
          totalUSDCents: 60678_04n,
        },
        {
          assetId: AssetId('BTC-10'),
          balance: -5287654321n,
          priceUSDCents: 38504_34n,
          totalUSDCents: -20359_76n,
        },
      ],
    },
    ''
  )

  function reduce(actions: FormAction[], from = INITIAL_STATE) {
    return actions.reduce((state, action) => nextFormState(state, action), from)
  }

  it('input amount', () => {
    const state = reduce([{ type: 'ModifyAmount', value: '1' }])
    expect(state).toEqual({
      ...INITIAL_STATE,
      amountInputString: '1',
      amountInputValue: 1_000000000n,
    })
  })

  it('input amount and delete', () => {
    const state = reduce([
      { type: 'ModifyAmount', value: '123' },
      { type: 'ModifyAmount', value: '' },
    ])
    expect(state).toEqual({
      ...INITIAL_STATE,
      amountInputString: '',
      amountInputValue: 0n,
    })
  })

  it('input price', () => {
    const state = reduce([{ type: 'ModifyPrice', value: '123' }])
    expect(state).toEqual({
      ...INITIAL_STATE,
      priceInputString: '123',
      priceInputValue: 123_000000n,
    })
  })

  it('input amount then price', () => {
    const state = reduce([
      { type: 'ModifyAmount', value: '2' },
      { type: 'ModifyPrice', value: '4' },
    ])
    expect(state).toEqual({
      ...INITIAL_STATE,
      amountInputString: '2',
      amountInputValue: 2_000000000n,
      priceInputString: '4',
      priceInputValue: 4_000000n,
      totalInputString: '8',
      totalInputValue: 8_000000n,
    })
  })

  it('input price then amount', () => {
    const state = reduce([
      { type: 'ModifyPrice', value: '4' },
      { type: 'ModifyAmount', value: '2' },
    ])
    expect(state).toEqual({
      ...INITIAL_STATE,
      amountInputString: '2',
      amountInputValue: 2_000000000n,
      priceInputString: '4',
      priceInputValue: 4_000000n,
      totalInputString: '8',
      totalInputValue: 8_000000n,
    })
  })

  it('input amount then total', () => {
    const state = reduce([
      { type: 'ModifyAmount', value: '2' },
      { type: 'ModifyTotal', value: '8' },
    ])
    expect(state).toEqual({
      ...INITIAL_STATE,
      boundVariable: 'total',
      amountInputString: '2',
      amountInputValue: 2_000000000n,
      priceInputString: '4',
      priceInputValue: 4_000000n,
      totalInputString: '8',
      totalInputValue: 8_000000n,
    })
  })

  it('input total then amount', () => {
    const state = reduce([
      { type: 'ModifyTotal', value: '8' },
      { type: 'ModifyAmount', value: '2' },
    ])
    expect(state).toEqual({
      ...INITIAL_STATE,
      boundVariable: 'total',
      amountInputString: '2',
      amountInputValue: 2_000000000n,
      priceInputString: '4',
      priceInputValue: 4_000000n,
      totalInputString: '8',
      totalInputValue: 8_000000n,
    })
  })
})
