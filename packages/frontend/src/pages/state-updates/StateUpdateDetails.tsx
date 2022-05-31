import React from 'react'

import { AssetCell } from '../common/AssetCell'
import { EtherscanLink } from '../common/EtherscanLink'
import { Page } from '../common/Page'
import { PageHeaderStats } from '../common/PageHeaderStats'
import { ClientPaginatedTable } from '../common/table'
import {
  formatAbsoluteTime,
  formatCurrency,
  formatCurrencyUnits,
  formatHashLong,
  formatRelativeTime,
} from '../formatting'
import { StateUpdateDetailsProps } from './StateUpdateDetailsProps'

export function StateUpdateDetails({
  id,
  hash,
  rootHash,
  positions,
  blockNumber,
  timestamp,
  transactions,
  account,
}: StateUpdateDetailsProps) {
  return (
    <Page
      title={`L2BEAT dYdX Explorer | ${hash.toString()}`}
      description="Site under construction"
      url="https://dydx.l2beat.com"
      image="/images/under-construction.png"
      stylesheets={['/styles/main.css']}
      scripts={['/scripts/main.js']}
      account={account}
    >
      <h1 className="font-sans font-bold text-2xl mb-12">
        State update #{id.toString()}
      </h1>
      <PageHeaderStats
        rows={[
          {
            title: 'State update hash',
            content: formatHashLong(hash),
          },
          {
            title: 'State tree root',
            content: formatHashLong(rootHash),
          },
          {
            title: 'Ethereum block number',
            content: (
              <EtherscanLink block={blockNumber}>{blockNumber}</EtherscanLink>
            ),
          },
          {
            title: 'Timestamp',
            content: formatAbsoluteTime(timestamp),
            fontRegular: true,
          },
        ]}
      />
      <div className="mb-1.5 font-medium text-lg text-left">
        Updated positions
      </div>
      <ClientPaginatedTable
        id="state-positions"
        noRowsText="this update did not affect any position"
        className="mb-8"
        columns={[
          { header: 'Position id' },
          { header: 'Owner', monospace: true, fullWidth: true },
          { header: 'Value before', numeric: true },
          { header: 'Value after', numeric: true },
          { header: 'Assets updated', numeric: true },
        ]}
        rows={positions.map(
          ({
            positionId,
            publicKey,
            totalUSDCents,
            previousTotalUSDCents,
            assetsUpdated,
          }) => ({
            cells: [
              positionId.toString(),
              formatHashLong(publicKey),
              previousTotalUSDCents
                ? formatCurrency(previousTotalUSDCents, 'USD')
                : '-',
              formatCurrency(totalUSDCents, 'USD'),
              assetsUpdated ? assetsUpdated.toString() : '0',
            ],
            link: `/positions/${positionId}`,
          })
        )}
      />
      <div className="mb-1.5 font-medium text-lg text-left">
        Included forced transactions
      </div>
      <ClientPaginatedTable
        id="state-transactions"
        noRowsText="this update does not include any forced transactions"
        columns={[
          { header: 'Type' },
          { header: 'Time' },
          { header: 'Hash', monospace: true, fullWidth: true },
          { header: 'Amount', numeric: true },
          { header: 'Asset' },
          { header: 'Position ID', numeric: true },
        ]}
        rows={transactions.map((transaction) => {
          const link = `/forced/${transaction.hash}`
          return {
            link,
            cells: [
              transaction.type,
              formatRelativeTime(transaction.lastUpdate),
              formatHashLong(transaction.hash),
              formatCurrencyUnits(transaction.amount, transaction.assetId),
              <AssetCell assetId={transaction.assetId} />,
              transaction.positionId.toString(),
            ],
          }
        })}
      />
    </Page>
  )
}
