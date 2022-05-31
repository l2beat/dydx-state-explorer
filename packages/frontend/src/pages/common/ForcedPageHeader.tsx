import { Hash256 } from '@explorer/types'
import React, { ReactNode } from 'react'

import { formatHashShort } from '../formatting'

function renderId(displayId: ForcedPageHeaderProps['displayId']): string {
  return typeof displayId === 'number'
    ? `#${displayId}`
    : formatHashShort(displayId)
}

interface ForcedPageHeaderProps {
  type: 'buy' | 'sell' | 'exit'
  displayId: number | Hash256
  children?: ReactNode
}

export function ForcedPageHeader(props: ForcedPageHeaderProps) {
  return (
    <h1 className="font-sans font-bold text-2xl mb-12 overflow-x-hidden text-ellipsis whitespace-nowrap flex justify-between content-center">
      Forced {props.type} {renderId(props.displayId)}
      {props.children}
    </h1>
  )
}
