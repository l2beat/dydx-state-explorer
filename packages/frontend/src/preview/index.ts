/* eslint-disable import/no-extraneous-dependencies */
import Router from '@koa/router'
import Koa from 'koa'
import serve from 'koa-static'

import {
  renderForcedTransactionsIndexPage,
  renderHomePage,
  renderPositionAtUpdatePage,
  renderPositionDetailsPage,
  renderStateUpdateDetailsPage,
  renderStateUpdatesIndexPage,
} from '../pages'
import * as DATA from './data'

const app = new Koa()
const router = new Router()

router.get('/', (ctx) => {
  ctx.body = renderHomePage(DATA.HOME_PROPS)
})
router.get('/state-updates', (ctx) => {
  ctx.body = renderStateUpdatesIndexPage(DATA.STATE_CHANGES_INDEX_PROPS)
})
router.get('/state-updates/:hash', (ctx) => {
  ctx.body = renderStateUpdateDetailsPage(DATA.STATE_CHANGE_DETAILS_PROPS)
})
router.get('/positions/:positionId', (ctx) => {
  ctx.body = renderPositionDetailsPage(DATA.POSITION_DETAILS_PROPS)
})
router.get('/positions/:positionId/updates/:updateId', (ctx) => {
  ctx.body = renderPositionAtUpdatePage(DATA.POSITION_AT_UPDATE_PROPS)
})
router.get('/forced-transactions', (ctx) => {
  ctx.body = renderForcedTransactionsIndexPage(
    DATA.FORCED_TRANSACTIONS_INDEX_PROPS
  )
})

app.use(router.routes())
app.use(router.allowedMethods())
app.use(serve('build/static'))

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
})
