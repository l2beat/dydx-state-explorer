import { AssetId } from '@explorer/types'

import { TransactionFormProps } from '../../pages/transaction-form'
import { FormAction, FormState } from './types'
import {
  formatCurrencyInput,
  getAsset,
  isBuyable,
  isSellable,
  parseCurrencyInput,
} from './utils'

export function getInitialState(
  props: TransactionFormProps,
  queryString: string
): FormState {
  const search = new URLSearchParams(queryString)
  const fromUrl = search.get('assetId')
  const initialAssetId = fromUrl ? AssetId(fromUrl) : props.selectedAsset

  const hasUSDC = props.assets.some((x) => x.assetId === AssetId.USDC)
  const hasBuy = props.assets.some(isBuyable)
  const hasSell = props.assets.some(isSellable)

  const candidate: FormState = {
    props,
    selectedAsset: props.assets[0],
    amountInputString: '',
    amountInputValue: 0n,
    amountInputError: false,
    priceInputString: '',
    priceInputValue: 0n,
    totalInputString: '',
    totalInputValue: 0n,
    boundVariable: 'price',
    canSubmit: false,

    exitButtonVisible: hasUSDC,
    buyButtonVisible: hasBuy,
    sellButtonVisible: hasSell,

    // To be determined by nextFormState
    exitButtonSelected: false,
    buyButtonSelected: false,
    sellButtonSelected: false,
    priceSectionVisible: false,
    totalSectionVisible: false,
    infoSectionVisible: false,
  }
  return nextFormState(candidate, {
    type: 'AssetChange',
    assetId: initialAssetId,
  })
}

export function nextFormState(state: FormState, action: FormAction): FormState {
  if (action.type === 'AssetChange') {
    const selectedAsset = getAsset(action.assetId, state.props.assets)

    const isUSDC = selectedAsset.assetId === AssetId.USDC
    const isPositive = selectedAsset.balance > 0n

    return {
      ...state,
      selectedAsset,
      amountInputString: '',
      amountInputValue: 0n,
      amountInputError: false,
      priceInputString: '',
      priceInputValue: 0n,
      totalInputString: '',
      totalInputValue: 0n,
      canSubmit: false,
      exitButtonSelected: isUSDC,
      buyButtonSelected: !isUSDC && !isPositive,
      sellButtonSelected: !isUSDC && isPositive,
      priceSectionVisible: !isUSDC,
      totalSectionVisible: !isUSDC,
      infoSectionVisible: isUSDC,
    }
  }

  if (action.type === 'SwitchToBuy') {
    const buyable = state.props.assets.find(isBuyable)
    if (!buyable) {
      throw new Error('Programmer error: Buy button should be invisible')
    }
    return nextFormState(state, {
      type: 'AssetChange',
      assetId: buyable.assetId,
    })
  }

  if (action.type === 'SwitchToSell') {
    const sellable = state.props.assets.find(isSellable)
    if (!sellable) {
      throw new Error('Programmer error: Sell button should be invisible')
    }
    return nextFormState(state, {
      type: 'AssetChange',
      assetId: sellable.assetId,
    })
  }

  if (action.type === 'UseMaxBalance') {
    return nextFormState(state, {
      type: 'ModifyAmount',
      value: formatCurrencyInput(
        state.selectedAsset.balance,
        state.selectedAsset.assetId
      ),
    })
  }

  if (action.type === 'UseSuggestedPrice') {
    return nextFormState(state, {
      type: 'ModifyPrice',
      value: formatCurrencyInput(
        state.selectedAsset.priceUSDCents * 10000n,
        AssetId.USDC
      ),
    })
  }

  if (action.type === 'ModifyAmount') {
    const parsed = parseCurrencyInput(action.value, state.selectedAsset.assetId)
    const amountInputString =
      parsed !== undefined ? action.value : state.amountInputString
    const amountInputValue = parsed ?? state.amountInputValue
    if (state.boundVariable === 'price') {
      return stateFromAmountAndPrice(
        state,
        amountInputString,
        amountInputValue,
        state.priceInputString,
        state.priceInputValue
      )
    } else {
      return stateFromAmountAndTotal(
        state,
        amountInputString,
        amountInputValue,
        state.totalInputString,
        state.totalInputValue
      )
    }
  }

  if (action.type === 'ModifyPrice') {
    const parsed = parseCurrencyInput(action.value, AssetId.USDC)
    const priceInputString =
      parsed !== undefined ? action.value : state.priceInputString
    const priceInputValue = parsed ?? state.priceInputValue
    return stateFromAmountAndPrice(
      state,
      state.amountInputString,
      state.amountInputValue,
      priceInputString,
      priceInputValue
    )
  }

  if (action.type === 'ModifyTotal') {
    const parsed = parseCurrencyInput(action.value, AssetId.USDC)
    const totalInputString =
      parsed !== undefined ? action.value : state.totalInputString
    const totalInputValue = parsed ?? state.totalInputValue
    return stateFromAmountAndTotal(
      state,
      state.amountInputString,
      state.amountInputValue,
      totalInputString,
      totalInputValue
    )
  }

  return state
}

function stateFromAmountAndPrice(
  state: FormState,
  amountInputString: string,
  amountInputValue: bigint,
  priceInputString: string,
  priceInputValue: bigint
): FormState {
  if (amountInputString === '' || priceInputString === '') {
    return withChecks({
      ...state,
      boundVariable: 'price',
      amountInputString,
      amountInputValue,
      priceInputString,
      priceInputValue,
      totalInputString: '',
      totalInputValue: 0n,
    })
  }
  const totalInputValue =
    (amountInputValue * priceInputValue) /
    10n ** BigInt(AssetId.decimals(state.selectedAsset.assetId))
  return withChecks({
    ...state,
    boundVariable: 'price',
    amountInputString,
    amountInputValue,
    priceInputString,
    priceInputValue,
    totalInputString: formatCurrencyInput(totalInputValue, AssetId.USDC),
    totalInputValue,
  })
}

function stateFromAmountAndTotal(
  state: FormState,
  amountInputString: string,
  amountInputValue: bigint,
  totalInputString: string,
  totalInputValue: bigint
): FormState {
  if (amountInputString === '' || totalInputString === '') {
    return withChecks({
      ...state,
      boundVariable: 'total',
      amountInputString,
      amountInputValue,
      totalInputString,
      totalInputValue,
      priceInputString: '',
      priceInputValue: 0n,
    })
  }
  const priceInputValue =
    (totalInputValue *
      10n ** BigInt(AssetId.decimals(state.selectedAsset.assetId))) /
    amountInputValue

  return withChecks({
    ...state,
    boundVariable: 'total',
    amountInputString,
    amountInputValue,
    totalInputString,
    totalInputValue,
    priceInputString: formatCurrencyInput(priceInputValue, AssetId.USDC),
    priceInputValue,
  })
}

function withChecks(state: FormState): FormState {
  const balance = state.selectedAsset.balance
  const absolute = balance < 0 ? -balance : balance
  if (state.selectedAsset.assetId === AssetId.USDC && balance < 0) {
    return {
      ...state,
      amountInputError: true,
      canSubmit: false,
    }
  }
  if (state.amountInputValue > absolute) {
    return {
      ...state,
      amountInputError: true,
      canSubmit: false,
    }
  }
  if (state.exitButtonSelected) {
    return {
      ...state,
      amountInputError: false,
      canSubmit: state.amountInputValue > 0n,
    }
  }
  return {
    ...state,
    amountInputError: false,
    canSubmit:
      state.amountInputValue > 0n &&
      state.priceInputValue > 0n &&
      state.totalInputValue > 0n,
  }
}
