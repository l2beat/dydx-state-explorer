import { expect } from 'earljs'

import { Timestamp } from '../src'

describe(Timestamp.name, () => {
  it('throws if not an integer', () => {
    expect(() => Timestamp(3.14)).toThrow(TypeError, 'Value must be an integer')
  })

  it('can be created from bigint', () => {
    expect(+Timestamp(10_000_000_000n)).toEqual(10_000_000_000)
  })

  it('can be created from integer', () => {
    expect(+Timestamp(10_000_000_000)).toEqual(10_000_000_000)
  })

  describe(Timestamp.fromSeconds.name, () => {
    it('can be created from bigint', () => {
      expect(+Timestamp.fromSeconds(10_000_000n)).toEqual(10_000_000_000)
    })

    it('can be created from integer', () => {
      expect(+Timestamp.fromSeconds(10_000_000)).toEqual(10_000_000_000)
    })
  })

  describe(Timestamp.fromHours.name, () => {
    it('can be created from bigint', () => {
      expect(+Timestamp.fromHours(1n)).toEqual(3600_000)
    })
    it('can be created from integer', () => {
      expect(+Timestamp.fromHours(1)).toEqual(3600_000)
    })
  })
})
