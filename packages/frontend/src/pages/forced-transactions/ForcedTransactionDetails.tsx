import { AssetId } from '@explorer/types'
import React from 'react'

import { Page } from '../common'
import { EtherscanLink } from '../common/EtherscanLink'
import { ForcedHistory } from '../common/ForcedHistory'
import { ForcedPageHeader } from '../common/ForcedPageHeader'
import { PageHeaderStats } from '../common/PageHeaderStats'
import { SimpleLink } from '../common/SimpleLink'
import { formatCurrency, formatHashLong } from '../formatting'
import { toStatsRows as toOfferStatsRows } from '../offers/ForcedTradeOfferDetails'
import {
  ForcedTransaction,
  ForcedTransactionDetailsProps,
} from './ForcedTransactionDetailsProps'

function toStatsRows(transaction: ForcedTransaction) {
  if (transaction.type === 'exit') {
    return [
      {
        title: 'Position id',
        content: (
          <SimpleLink href={`/positions/${transaction.data.positionId}`}>
            #{transaction.data.positionId.toString()}
          </SimpleLink>
        ),
      },
      {
        title: 'Ethereum address',
        content: transaction.data.ethereumAddress ? (
          <EtherscanLink address={transaction.data.ethereumAddress}>
            {transaction.data.ethereumAddress}
          </EtherscanLink>
        ) : (
          '-'
        ),
      },
      {
        title: 'Value',
        content: formatCurrency(transaction.data.value, AssetId.USDC),
      },
      {
        title: 'Transaction hash',
        content: (
          <EtherscanLink transaction={transaction.data.transactionHash}>
            {formatHashLong(transaction.data.transactionHash)}
          </EtherscanLink>
        ),
      },
      {
        title: 'State update id',
        content: transaction.data.stateUpdateId ? (
          <SimpleLink href={`/state-updates/${transaction.data.stateUpdateId}`}>
            #{transaction.data.stateUpdateId.toString()}
          </SimpleLink>
        ) : (
          '-'
        ),
      },
    ]
  }

  return [
    ...toOfferStatsRows({ type: transaction.type, ...transaction.data }),
    {
      title: 'Transaction hash',
      content: (
        <EtherscanLink transaction={transaction.data.transactionHash}>
          {formatHashLong(transaction.data.transactionHash)}
        </EtherscanLink>
      ),
    },
  ]
}

export function ForcedTransactionDetails({
  account,
  history,
  transaction,
}: ForcedTransactionDetailsProps) {
  const displayId =
    transaction.type === 'exit'
      ? transaction.data.transactionHash
      : transaction.data.displayId
  return (
    <Page
      title="L2BEAT dYdX Explorer"
      description="Site under construction"
      url="https://dydx.l2beat.com"
      image="/images/under-construction.png"
      stylesheets={['/styles/main.css']}
      scripts={['/scripts/main.js']}
      account={account}
    >
      <ForcedPageHeader displayId={displayId} type={transaction.type} />
      <div className="mb-1.5 font-medium text-lg text-left">Stats</div>
      <PageHeaderStats rows={toStatsRows(transaction)} />
      <ForcedHistory events={history} />
    </Page>
  )
}
