import cx from 'classnames'
import React from 'react'

import { SearchIcon } from './icons/SearchIcon'

export function SearchBar({ className = '' }) {
  return (
    <form
      method="GET"
      action="/search"
      className={cx(
        'w-full bg-grey-200 flex h-11 rounded-md drop-shadow-lg',
        className
      )}
    >
      <input
        className="w-full placeholder:text-grey-400 bg-grey-200 p-4 rounded-l-md outline-0"
        type="text"
        placeholder="Search by hash, Stark key or Ethereum address…"
        name="query"
      />
      <button className="bg-grey-300 w-12 flex items-center justify-center rounded-r-md">
        <SearchIcon width={16} height={16} />
      </button>
    </form>
  )
}
