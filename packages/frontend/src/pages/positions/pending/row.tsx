import cx from 'classnames'
import React, { ReactNode } from 'react'

export function PendingRow({
  cells,
  accent,
  fullWidth,
  numeric,
}: {
  cells: ReactNode[]
  accent: boolean
  fullWidth: number
  numeric: number[]
}) {
  return (
    <tr
      className={cx(
        accent ? 'bg-grey-300' : 'bg-grey-200',
        'whitespace-nowrap'
      )}
    >
      {cells.map((cell, i) => (
        <td
          className={cx(
            'p-2 overflow-x-hidden text-ellipsis',
            i !== fullWidth && 'w-0',
            numeric.includes(i) && 'font-mono'
          )}
          key={i}
        >
          {cell}
        </td>
      ))}
    </tr>
  )
}
