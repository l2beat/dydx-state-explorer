import { AssetBalance, AssetId, OraclePrice } from '@explorer/encoding'
import { Knex } from 'knex'
import {
  AssetBalanceJson,
  PositionRow,
  PriceRow,
  StateUpdateRow,
} from 'knex/types/tables'

import { Logger } from '../../tools/Logger'

export interface StateUpdateRecord {
  id: number
  blockNumber: number
  factHash: string
  rootHash: string
  factTimestamp: number
  dataTimestamp: number
}

export interface PositionRecord {
  positionId: number
  publicKey: string
  collateralBalance: bigint
  balances: AssetBalance[]
}

export class StateUpdateRepository {
  constructor(private knex: Knex, private logger: Logger) {
    this.logger = logger.for(this)
  }

  async add({
    stateUpdate,
    positions,
    prices,
  }: {
    stateUpdate: StateUpdateRecord
    positions: PositionRecord[]
    prices: OraclePrice[]
  }) {
    await this.knex.transaction(async (trx) => {
      await this.knex('state_updates')
        .insert([toStateUpdateRow(stateUpdate)])
        .transacting(trx)

      if (positions.length > 0)
        await this.knex('positions')
          .insert(positions.map((pos) => toPositionRow(pos, stateUpdate.id)))
          .transacting(trx)

      if (prices.length > 0)
        await this.knex('prices')
          .insert(prices.map((price) => toPriceRow(price, stateUpdate.id)))
          .transacting(trx)

      this.logger.debug({
        method: 'add',
        id: stateUpdate.id,
        blockNumber: stateUpdate.blockNumber,
      })
    })
  }

  async delete(stateUpdateId: number) {
    await this.knex('state_updates').where('id', stateUpdateId).first().delete()
  }

  async getPositionById(positionId: number) {
    const rows = await this.knex('positions')
      .select('*')
      .where('position_id', positionId)
      .orderBy('state_update_id', 'desc')

    return rows.map(toPositionRecord)
  }

  async getAll() {
    const rows = await this.knex('state_updates').select('*')
    this.logger.debug({ method: 'getAll', rows: rows.length })
    return rows.map(toStateUpdateRecord)
  }

  async deleteAll() {
    await this.knex('state_updates').delete()
    this.logger.debug({ method: 'deleteAll' })
  }
}

function toStateUpdateRecord(row: StateUpdateRow): StateUpdateRecord {
  return {
    id: row.id,
    blockNumber: row.block_number,
    factHash: row.fact_hash,
    rootHash: row.root_hash,
    factTimestamp: row.fact_timestamp,
    dataTimestamp: row.data_timestamp,
  }
}

function toStateUpdateRow(record: StateUpdateRecord): StateUpdateRow {
  return {
    id: record.id,
    block_number: record.blockNumber,
    fact_hash: record.factHash,
    root_hash: record.rootHash,
    fact_timestamp: record.factTimestamp,
    data_timestamp: record.dataTimestamp,
  }
}

function toPositionRecord(
  row: PositionRow
): PositionRecord & { stateUpdateId: number } {
  return {
    stateUpdateId: row.state_update_id,
    positionId: row.position_id,
    publicKey: row.public_key,
    collateralBalance: row.collateral_balance,
    balances: (typeof row.balances === 'string'
      ? (JSON.parse(row.balances) as AssetBalanceJson[])
      : row.balances
    ).map((x) => ({
      assetId: AssetId(x.asset_id),
      balance: BigInt(x.balance),
    })),
  }
}

function toPositionRow(
  record: PositionRecord,
  stateUpdateId: number
): PositionRow {
  const balances = record.balances.map(
    (x): AssetBalanceJson => ({
      asset_id: x.assetId.toString(),
      balance: x.balance.toString(),
    })
  )

  return {
    state_update_id: stateUpdateId,
    position_id: record.positionId,
    public_key: record.publicKey,
    collateral_balance: record.collateralBalance,
    balances: JSON.stringify(balances),
  }
}

function toPriceRow(record: OraclePrice, stateUpdateId: number): PriceRow {
  return {
    state_update_id: stateUpdateId,
    asset_id: record.assetId.toString(),
    price: record.price,
  }
}