import React, { ReactNode } from 'react'

import { AccountDetails } from '../AccountDetails'
import { Footer } from './Footer'
import { Head } from './Head'
import { Navbar } from './Navbar'

interface Props {
  account: AccountDetails | undefined
  withoutSearch?: boolean
  description: string
  image?: string
  baseTitle?: string
  title?: string
  baseUrl?: string
  path: string
  scripts?: string[]
  stylesheets?: string[]
  children: ReactNode
}

export function Page({
  account,
  withoutSearch,
  description,
  image = '/images/under-construction.png',
  baseTitle = 'L2BEAT dYdX Explorer',
  title,
  baseUrl = 'https://dydx.l2beat.com',
  path,
  stylesheets = ['/styles/main.css'],
  scripts = ['/scripts/main.js'],
  children,
}: Props) {
  return (
    <html lang="en" className="bg-grey-100 text-white">
      <Head
        description={description}
        image={image}
        title={combineTitle(baseTitle, title)}
        url={combineUrl(baseUrl, path)}
        stylesheets={stylesheets}
      />
      <body>
        <Navbar searchBar={!withoutSearch} account={account} />
        <main className="px-2 wide:px-4 max-w-[900px] mx-auto pt-8 wide:pt-20 pb-20">
          {children}
        </main>
        <Footer />
        {scripts.map((src, i) => (
          <script key={i} src={src} />
        ))}
      </body>
    </html>
  )
}

function combineTitle(baseTitle: string, title: string | undefined) {
  if (!title) {
    return baseTitle
  } else {
    return `${title} | ${baseTitle}`
  }
}

function combineUrl(baseUrl: string, path: string) {
  if (path === '' || path === '/') {
    return baseUrl
  }
  if (path.startsWith('/')) {
    return `${baseUrl}${path}`
  } else {
    return `${baseUrl}/${path}`
  }
}
