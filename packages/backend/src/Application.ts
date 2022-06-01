import { ApiServer } from './api/ApiServer'
import { ForcedTradeOfferController } from './api/controllers/ForcedTradeOfferController'
import { ForcedTransactionController } from './api/controllers/ForcedTransactionController'
import { HomeController } from './api/controllers/HomeController'
import { PositionController } from './api/controllers/PositionController'
import { SearchController } from './api/controllers/SearchController'
import { StateUpdateController } from './api/controllers/StateUpdateController'
import { TransactionSubmitController } from './api/controllers/TransactionSubmitController'
import { createFrontendMiddleware } from './api/middleware/FrontendMiddleware'
import { createForcedTransactionRouter } from './api/routers/ForcedTransactionRouter'
import { createFrontendRouter } from './api/routers/FrontendRouter'
import { createStatusRouter } from './api/routers/StatusRouter'
import { Config } from './config'
import { DataSyncService } from './core/DataSyncService'
import { ForcedEventsCollector } from './core/ForcedEventsCollector'
import { MemoryHashEventCollector } from './core/MemoryHashEventCollector'
import { PageCollector } from './core/PageCollector'
import { StateTransitionFactCollector } from './core/StateTransitionFactCollector'
import { StateUpdateCollector } from './core/StateUpdateCollector'
import { StatusService } from './core/StatusService'
import { BlockDownloader } from './core/sync/BlockDownloader'
import { SyncScheduler } from './core/sync/SyncScheduler'
import { TransactionStatusMonitor } from './core/TransactionStatusMonitor'
import { TransactionStatusService } from './core/TransactionStatusService'
import { UserRegistrationCollector } from './core/UserRegistrationCollector'
import { VerifierCollector } from './core/VerifierCollector'
import { BlockRepository } from './peripherals/database/BlockRepository'
import { DatabaseService } from './peripherals/database/DatabaseService'
import { FactToPageRepository } from './peripherals/database/FactToPageRepository'
import { ForcedTradeOfferRepository } from './peripherals/database/ForcedTradeOfferRepository'
import { ForcedTransactionsRepository } from './peripherals/database/ForcedTransactionsRepository'
import { KeyValueStore } from './peripherals/database/KeyValueStore'
import { PageRepository } from './peripherals/database/PageRepository'
import { PositionRepository } from './peripherals/database/PositionRepository'
import { RollupStateRepository } from './peripherals/database/RollupStateRepository'
import { StateTransitionFactRepository } from './peripherals/database/StateTransitionFactsRepository'
import { StateUpdateRepository } from './peripherals/database/StateUpdateRepository'
import { SyncStatusRepository } from './peripherals/database/SyncStatusRepository'
import { TransactionStatusRepository } from './peripherals/database/TransactionStatusRepository'
import { UserRegistrationEventRepository } from './peripherals/database/UserRegistrationEventRepository'
import { VerifierEventRepository } from './peripherals/database/VerifierEventRepository'
import { EthereumClient } from './peripherals/ethereum/EthereumClient'
import { Logger } from './tools/Logger'

export class Application {
  start: () => Promise<void>

  constructor(config: Config) {
    // #region tools

    const logger = new Logger(config.logger)

    // #endregion tools
    // #region peripherals

    const knex = DatabaseService.createKnexInstance(config.databaseConnection)
    const databaseService = new DatabaseService(knex, logger)

    const kvStore = new KeyValueStore(knex, logger)
    const syncStatusRepository = new SyncStatusRepository(kvStore)
    const verifierEventRepository = new VerifierEventRepository(knex, logger)
    const factToPageRepository = new FactToPageRepository(knex, logger)
    const pageRepository = new PageRepository(knex, logger)
    const stateTransitionFactRepository = new StateTransitionFactRepository(
      knex,
      logger
    )
    const blockRepository = new BlockRepository(knex, logger)
    const rollupStateRepository = new RollupStateRepository(knex, logger)
    const stateUpdateRepository = new StateUpdateRepository(knex, logger)
    const positionRepository = new PositionRepository(knex, logger)
    const userRegistrationEventRepository = new UserRegistrationEventRepository(
      knex,
      logger
    )
    const forcedTransactionsRepository = new ForcedTransactionsRepository(
      knex,
      logger
    )
    const forcedTradeOfferRepository = new ForcedTradeOfferRepository(
      knex,
      logger
    )
    const transactionStatusRepository = new TransactionStatusRepository(
      knex,
      logger
    )
    const ethereumClient = new EthereumClient(config.jsonRpcUrl)

    // #endregion peripherals
    // #region core

    const blockDownloader = new BlockDownloader(
      ethereumClient,
      blockRepository,
      logger
    )

    const statusService = new StatusService({
      databaseService,
      blockDownloader,
    })

    const verifierCollector = new VerifierCollector(
      ethereumClient,
      verifierEventRepository,
      config.contracts.proxy,
      config.contracts.verifiers
    )
    const memoryHashEventCollector = new MemoryHashEventCollector(
      ethereumClient,
      factToPageRepository
    )
    const pageCollector = new PageCollector(
      ethereumClient,
      pageRepository,
      config.contracts.registry
    )
    const stateTransitionFactCollector = new StateTransitionFactCollector(
      ethereumClient,
      stateTransitionFactRepository,
      config.contracts.perpetual
    )
    const stateUpdateCollector = new StateUpdateCollector(
      pageRepository,
      stateUpdateRepository,
      rollupStateRepository,
      ethereumClient,
      forcedTransactionsRepository
    )
    const userRegistrationCollector = new UserRegistrationCollector(
      ethereumClient,
      userRegistrationEventRepository,
      config.contracts.perpetual
    )
    const forcedEventsCollector = new ForcedEventsCollector(
      ethereumClient,
      forcedTransactionsRepository,
      transactionStatusRepository,
      config.contracts.perpetual
    )

    const dataSyncService = new DataSyncService(
      verifierCollector,
      memoryHashEventCollector,
      pageCollector,
      stateTransitionFactCollector,
      stateUpdateCollector,
      userRegistrationCollector,
      forcedEventsCollector,
      logger
    )
    const syncScheduler = new SyncScheduler(
      syncStatusRepository,
      blockDownloader,
      dataSyncService,
      logger,
      {
        earliestBlock: config.core.minBlockNumber,
        maxBlockNumber: config.core.maxBlockNumber,
      }
    )
    const transactionStatusService = new TransactionStatusService(
      transactionStatusRepository,
      ethereumClient,
      logger
    )
    const transactionStatusMonitor = new TransactionStatusMonitor(
      transactionStatusService
    )

    // #endregion core
    // #region api

    const positionController = new PositionController(
      stateUpdateRepository,
      positionRepository,
      userRegistrationEventRepository,
      forcedTransactionsRepository,
      forcedTradeOfferRepository
    )
    const homeController = new HomeController(
      stateUpdateRepository,
      positionRepository,
      forcedTransactionsRepository,
      forcedTradeOfferRepository
    )
    const forcedTransactionController = new ForcedTransactionController(
      userRegistrationEventRepository,
      positionRepository,
      forcedTransactionsRepository,
      config.contracts.perpetual
    )
    const stateUpdateController = new StateUpdateController(
      stateUpdateRepository,
      positionRepository,
      forcedTransactionsRepository
    )
    const searchController = new SearchController(
      stateUpdateRepository,
      positionRepository,
      userRegistrationEventRepository
    )
    const forcedTradeOfferController = new ForcedTradeOfferController(
      forcedTradeOfferRepository,
      positionRepository,
      userRegistrationEventRepository
    )
    const userTransactionController = new TransactionSubmitController(
      ethereumClient,
      forcedTransactionsRepository,
      config.contracts.perpetual
    )

    const apiServer = new ApiServer(config.port, logger, {
      routers: [
        createStatusRouter(statusService),
        createFrontendRouter(
          positionController,
          homeController,
          forcedTradeOfferController,
          forcedTransactionController,
          stateUpdateController,
          searchController
        ),
        createForcedTransactionRouter(
          forcedTradeOfferController,
          userTransactionController
        ),
      ],
      middleware: [createFrontendMiddleware()],
    })

    // #endregion api
    // #region start

    this.start = async () => {
      logger.for(this).info('Starting')

      if (config.freshStart) await databaseService.rollbackAll()
      await databaseService.migrateToLatest()

      await apiServer.listen()
      if (config.enableSync) {
        transactionStatusMonitor.start()
        await syncScheduler.start()
        await blockDownloader.start()
      }

      logger.for(this).info('Started')
    }

    // #endregion start
  }
}
