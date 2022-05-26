import { initMetamask } from './metamask'
import { initOffersFilteringForm } from './offer/filteringForm'
import { initPagination } from './pagination'
import { initTransactionForm } from './transaction/transactionForm'
import { initTVLDisplay } from './tvl'

initTVLDisplay()
initMetamask()
initPagination()
initTransactionForm()
initOffersFilteringForm()
