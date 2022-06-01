import React from 'react'

import { reactToHtml } from '../reactToHtml'
import { PositionAtUpdate } from './PositionAtUpdate'
import { PositionAtUpdateProps } from './PositionAtUpdateProps'
import { PositionDetails } from './PositionDetails'
import { PositionDetailsProps } from './PositionDetailsProps'

export * from './pending/offers'
export * from './PositionAtUpdateProps'
export * from './PositionDetailsProps'

export function renderPositionDetailsPage(props: PositionDetailsProps) {
  return reactToHtml(<PositionDetails {...props} />)
}

export function renderPositionAtUpdatePage(props: PositionAtUpdateProps) {
  return reactToHtml(<PositionAtUpdate {...props} />)
}
