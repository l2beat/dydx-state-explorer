import cx from 'classnames'
import React, { ReactNode } from 'react'

export function SimpleLink({
  className,
  href,
  children,
}: {
  className?: string
  href: string
  children: ReactNode
}) {
  return (
    <a href={href} className={cx('text-blue-200 underline', className)}>
      {children}
    </a>
  )
}
