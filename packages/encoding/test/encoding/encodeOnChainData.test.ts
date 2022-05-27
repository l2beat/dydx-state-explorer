import { AssetId, PedersenHash, StarkKey, Timestamp } from '@explorer/types'
import { expect } from 'earljs'

import { decodeOnChainData, encodeOnChainData, OnChainData } from '../../src'

describe(encodeOnChainData.name, () => {
  const data: OnChainData = {
    configurationHash: PedersenHash.fake().toString(),
    assetConfigHashes: [
      { assetId: AssetId('ABC-3'), hash: PedersenHash.fake().toString() },
      { assetId: AssetId('DEF-6'), hash: PedersenHash.fake().toString() },
      { assetId: AssetId('GHI-9'), hash: PedersenHash.fake().toString() },
    ],
    oldState: {
      positionRoot: PedersenHash.fake().toString(),
      positionHeight: 64,
      orderRoot: PedersenHash.fake().toString(),
      orderHeight: 64,
      indices: [
        { assetId: AssetId('ABC-3'), value: 123n },
        { assetId: AssetId('DEF-6'), value: -456n },
        { assetId: AssetId('GHI-9'), value: 789n },
      ],
      timestamp: Timestamp.fromSeconds(69_420n),
      oraclePrices: [
        { assetId: AssetId('ABC-3'), price: 10_000n },
        { assetId: AssetId('DEF-6'), price: 200_000n },
        { assetId: AssetId('GHI-9'), price: 3_000_000n },
      ],
      systemTime: Timestamp.fromSeconds(1337n),
    },
    newState: {
      positionRoot: PedersenHash.fake().toString(),
      positionHeight: 64,
      orderRoot: PedersenHash.fake().toString(),
      orderHeight: 64,
      indices: [
        { assetId: AssetId('ABC-3'), value: 1234n },
        { assetId: AssetId('DEF-6'), value: -4567n },
        { assetId: AssetId('GHI-9'), value: 7890n },
      ],
      timestamp: Timestamp.fromSeconds(69_421n),
      oraclePrices: [
        { assetId: AssetId('ABC-3'), price: 20_000n },
        { assetId: AssetId('DEF-6'), price: 300_000n },
        { assetId: AssetId('GHI-9'), price: 4_000_000n },
      ],
      systemTime: Timestamp.fromSeconds(1338n),
    },
    minimumExpirationTimestamp: 123456n,
    modifications: [
      { positionId: 1n, publicKey: StarkKey.fake(), difference: 2n },
      { positionId: 2n, publicKey: StarkKey.fake(), difference: -3n },
    ],
    forcedActions: [
      {
        type: 'withdrawal',
        positionId: 100n,
        publicKey: StarkKey.fake(),
        amount: 50_000n,
      },
      {
        type: 'trade',
        positionIdA: 100n,
        positionIdB: 200n,
        publicKeyA: StarkKey.fake(),
        publicKeyB: StarkKey.fake(),
        collateralAmount: 20_000n,
        syntheticAmount: 10_000n,
        isABuyingSynthetic: true,
        nonce: 1234n,
        syntheticAssetId: AssetId('ABC-3'),
      },
    ],
    conditions: [
      PedersenHash.fake().toString(),
      PedersenHash.fake().toString(),
    ],
    funding: [],
    positions: [],
  }

  it(`is compatible with ${decodeOnChainData.name}`, () => {
    const encoded = encodeOnChainData(data)
    const decoded = decodeOnChainData(encoded)
    expect(decoded).toEqual(data)
  })
})