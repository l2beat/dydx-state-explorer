import { BigNumber } from 'ethers'

import { fakeHexString } from './fake'

export interface Hash256 extends String {
  _Hash256Brand: string
}

export function Hash256(value: string) {
  if (!value.startsWith('0x')) {
    value = '0x' + value
  }
  if (!/^0x[a-f\d]{64}$/i.test(value)) {
    throw new TypeError('Invalid Hash256')
  }
  return value.toLowerCase() as unknown as Hash256
}

Hash256.from = function from(value: BigNumber | bigint) {
  if (BigNumber.isBigNumber(value)) {
    value = value.toBigInt()
  }
  return Hash256('0x' + value.toString(16).padStart(64, '0'))
}

Hash256.fake = function fake(start?: string) {
  if (!start) {
    return Hash256(fakeHexString(64))
  } else {
    return Hash256(start.padEnd(64, '0'))
  }
}
