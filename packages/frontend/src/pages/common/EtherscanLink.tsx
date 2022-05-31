import { EthereumAddress, Hash256 } from '@explorer/types'
import React, { ReactNode } from 'react'

import { SimpleLink } from './SimpleLink'

interface EtherscanLinkProps {
  block?: number | bigint
  address?: EthereumAddress
  transaction?: Hash256
  className?: string
  children: ReactNode
}

export function EtherscanLink(props: EtherscanLinkProps) {
  let href = ''
  if (props.block !== undefined) {
    href = `https://etherscan.io/block/${props.block}`
  } else if (props.address) {
    href = `https://etherscan.io/address/${props.address}`
  } else if (props.transaction) {
    href = `https://etherscan.io/tx/${props.transaction}`
  }
  if (!href) {
    return null
  }
  return (
    <SimpleLink className={props.className} href={href}>
      {props.children}
    </SimpleLink>
  )
}
