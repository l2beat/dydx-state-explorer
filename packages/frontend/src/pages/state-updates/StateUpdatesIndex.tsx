import React from 'react'

import { Page } from '../common'
import { Pagination } from '../common/Pagination'
import { Table } from '../common/table'
import { formatHashLong, formatRelativeTime } from '../formatting'
import { StateUpdatesIndexProps } from './StateUpdatesIndexProps'

export function StateUpdatesIndex({
  stateUpdates,
  params: { perPage, page },
  fullCount,
  account,
}: StateUpdatesIndexProps) {
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
      <h1 className="font-sans font-bold text-2xl mb-12">
        Latest state updates
      </h1>
      <Pagination
        perPage={perPage}
        page={page}
        fullCount={fullCount}
        baseUrl="/state-updates"
      />
      <Table
        noRowsText="no state updates have occurred so far"
        columns={[
          { header: 'No.' },
          { header: 'Hash', monospace: true, fullWidth: true },
          { header: 'Time' },
          { header: 'Position updates', numeric: true },
        ]}
        rows={stateUpdates.map((update) => {
          const link = `/state-updates/${update.id}`
          return {
            link,
            cells: [
              update.id.toString(),
              formatHashLong(update.hash),
              formatRelativeTime(update.timestamp),
              update.positionCount.toString(),
            ],
          }
        })}
      />
    </Page>
  )
}
