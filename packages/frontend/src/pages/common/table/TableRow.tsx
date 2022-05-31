import cx from 'classnames'
import React from 'react'

import { Column, Row } from './types'

export interface TableRowProps extends Row {
  i: number
  columns: Column[]
  hidden?: boolean
}

export function TableRow(props: TableRowProps) {
  return (
    <tr
      className={cx(
        'my-4 whitespace-nowrap',
        props.link && 'hover:bg-blue-100',
        props.i % 2 !== 0 && 'bg-grey-200',
        props.hidden && 'hidden'
      )}
    >
      {props.cells.map((cell, col) => {
        const { fullWidth, numeric, monospace } = props.columns[col] || {}
        return (
          <td
            key={col}
            className={cx(
              !props.link && 'px-1.5 py-0.5',
              'first-letter:capitalize',
              (numeric || monospace) && 'font-mono',
              numeric ? 'text-right' : 'text-left',
              fullWidth ? 'max-w-[10px] truncate' : 'w-0',
              props.link && 'cursor-pointer'
            )}
          >
            {props.link ? (
              <a
                className="px-1.5 py-0.5 block w-full truncate"
                href={props.link}
              >
                {cell}
              </a>
            ) : (
              cell
            )}
          </td>
        )
      })}
    </tr>
  )
}
