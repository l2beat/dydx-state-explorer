import { AssetId, Hash256, StarkKey, Timestamp } from '@explorer/types'
import { Knex } from 'knex'
import { ForcedTradeOfferRow as Row } from 'knex/types/tables'

import { Logger } from '../../tools/Logger'
import { BaseRepository } from './BaseRepository'

export interface Accepted {
  at: Timestamp
  starkKeyB: StarkKey
  positionIdB: bigint
  submissionExpirationTime: bigint // unix time in hours
  nonce: bigint
  premiumCost: boolean
  signature: string // HEX string signature of all parameters
  transactionHash?: Hash256
}

interface Record {
  id: number
  createdAt: Timestamp
  starkKeyA: StarkKey
  positionIdA: bigint
  syntheticAssetId: AssetId
  collateralAmount: bigint
  syntheticAmount: bigint
  isABuyingSynthetic: boolean
  accepted?: Accepted
  cancelledAt?: Timestamp
}
export { type Record as ForcedTradeOfferRecord }

type RecordCandidate = Omit<Record, 'id'> & { id?: Record['id'] }
type RowCandidate = Omit<Row, 'id'> & { id?: Row['id'] }

function toRowCandidate(record: RecordCandidate): RowCandidate {
  const orNull = <T>(value?: T) => (value !== undefined ? value : null)
  return {
    id: record.id,
    created_at: BigInt(record.createdAt.toString()),
    stark_key_a: record.starkKeyA.toString(),
    position_id_a: record.positionIdA,
    synthetic_asset_id: record.syntheticAssetId.toString(),
    collateral_amount: record.collateralAmount,
    synthetic_amount: record.syntheticAmount,
    is_a_buying_synthetic: record.isABuyingSynthetic,
    accepted_at: record.accepted?.at
      ? BigInt(record.accepted.at.toString())
      : null,
    stark_key_b: orNull(record.accepted?.starkKeyB.toString()),
    position_id_b: orNull(record.accepted?.positionIdB),
    submission_expiration_time: orNull(
      record.accepted?.submissionExpirationTime
    ),
    nonce: orNull(record.accepted?.nonce),
    premium_cost: orNull(record.accepted?.premiumCost),
    signature: orNull(record.accepted?.signature),
    transaction_hash: orNull(record.accepted?.transactionHash?.toString()),
    cancelled_at:
      record.cancelledAt !== undefined
        ? BigInt(record.cancelledAt.toString())
        : null,
  }
}

function toRow(record: Record): Row {
  return {
    ...toRowCandidate(record),
    id: record.id,
  }
}

function toRecord(row: Row): Record {
  const record = {
    id: row.id,
    createdAt: Timestamp(row.created_at),
    starkKeyA: StarkKey(row.stark_key_a),
    positionIdA: row.position_id_a,
    syntheticAssetId: AssetId(row.synthetic_asset_id),
    collateralAmount: row.collateral_amount,
    syntheticAmount: row.synthetic_amount,
    isABuyingSynthetic: row.is_a_buying_synthetic,
    accepted: undefined,
    cancelledAt: row.cancelled_at ? Timestamp(row.cancelled_at) : undefined,
  }
  if (
    row.accepted_at !== null &&
    row.stark_key_b !== null &&
    row.position_id_b !== null &&
    row.submission_expiration_time !== null &&
    row.nonce !== null &&
    row.premium_cost !== null &&
    row.signature !== null
  ) {
    return {
      ...record,
      accepted: {
        at: Timestamp(row.accepted_at),
        nonce: row.nonce,
        positionIdB: row.position_id_b,
        premiumCost: row.premium_cost,
        signature: row.signature,
        starkKeyB: StarkKey(row.stark_key_b),
        submissionExpirationTime: row.submission_expiration_time,
        transactionHash: row.transaction_hash
          ? Hash256(row.transaction_hash)
          : undefined,
      },
    }
  } else {
    return record
  }
}

interface InitialFilters {
  type?: 'buy' | 'sell'
  assetId?: AssetId
}

export class ForcedTradeOfferRepository extends BaseRepository {
  constructor(knex: Knex, logger: Logger) {
    super(knex, logger)
    this.add = this.wrapAdd(this.add)
    this.findById = this.wrapFind(this.findById)
    this.countInitial = this.wrapAny(this.countInitial)
    this.getInitial = this.wrapGet(this.getInitial)
    this.countActiveByPositionId = this.wrapAny(this.countActiveByPositionId)
    this.getByPositionId = this.wrapGet(this.getByPositionId)
    this.deleteAll = this.wrapDelete(this.deleteAll)
    this.save = this.wrapSave(this.save)
  }

  async add(record: RecordCandidate): Promise<Record['id']> {
    const row = toRowCandidate(record)
    const [id] = await this.knex('forced_trade_offers')
      .insert(row)
      .returning('id')
    return id
  }

  async save(record: Record): Promise<boolean> {
    const row = toRow(record)
    const updates = await this.knex('forced_trade_offers')
      .update(row)
      .where('id', '=', row.id)
    return !!updates
  }

  private getInitialQuery({ assetId, type }: InitialFilters = {}) {
    const query = this.knex('forced_trade_offers')
      .whereNull('accepted_at')
      .whereNull('cancelled_at')
    if (assetId) {
      query.andWhere('synthetic_asset_id', '=', assetId.toString())
    }
    if (type) {
      query.andWhere(
        'is_a_buying_synthetic',
        '=',
        type === 'buy' ? true : false
      )
    }
    return query
  }

  async countInitial({ assetId, type }: InitialFilters = {}): Promise<number> {
    const [{ count }] = await this.getInitialQuery({ assetId, type }).count()
    return Number(count)
  }

  async getInitial({
    limit,
    offset,
    assetId,
    type,
  }: {
    limit: number
    offset: number
  } & InitialFilters): Promise<Record[]> {
    const rows = await this.getInitialQuery({ assetId, type })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)

    return rows.map(toRecord)
  }

  async getInitialAssetIds(): Promise<AssetId[]> {
    const rowIds = await this.getInitialQuery().distinct('synthetic_asset_id')
    return rowIds.map((x) => x.synthetic_asset_id).map(AssetId)
  }

  private getByPositionIdQuery(positionId: bigint) {
    return this.knex('forced_trade_offers').where(function () {
      this.where({ position_id_a: positionId }).orWhere({
        position_id_b: positionId,
      })
    })
  }

  async countActiveByPositionId(positionId: bigint) {
    const [{ count }] = await this.getByPositionIdQuery(positionId)
      .whereNull('cancelled_at')
      .whereNull('transaction_hash')
      .count()
    return Number(count)
  }

  async getByPositionId(positionId: bigint) {
    const rows = await this.getByPositionIdQuery(positionId)
    return rows.map(toRecord)
  }

  async findById(id: Record['id']): Promise<Record | undefined> {
    const row = await this.knex('forced_trade_offers').where({ id }).first()
    return row ? toRecord(row) : undefined
  }

  async findByHash(hash: Hash256): Promise<Record | undefined> {
    const row = await this.knex('forced_trade_offers')
      .where({ transaction_hash: hash.toString() })
      .first()
    return row ? toRecord(row) : undefined
  }

  async deleteAll() {
    return await this.knex('forced_trade_offers').delete()
  }
}
