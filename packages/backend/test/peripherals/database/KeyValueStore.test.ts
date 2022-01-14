import { expect } from 'chai'
import { AssertTrue, IsExact } from 'conditional-type-checks'

import { KeyValueStore } from '../../../src/peripherals/database/KeyValueStore'
import { Logger } from '../../../src/tools/Logger'
import { setupDatabaseTestSuite } from './setup'

describe(KeyValueStore.name, () => {
  const { knex } = setupDatabaseTestSuite()
  type TestKey = '1' | '2' | '3' | 'key'
  const kvStore = new KeyValueStore<TestKey>(knex, Logger.SILENT)

  afterEach(() => kvStore.deleteAll())

  it('sets and reads value', async () => {
    kvStore.set('key', 'value')
    const actual = await kvStore.get('key')
    expect(actual).to.eq('value')
  })

  it('reads and removes all values', async () => {
    await Promise.all([
      kvStore.set('1', 'one'),
      kvStore.set('2', 'two'),
      kvStore.set('3', 'three'),
    ])

    let actual = await kvStore.getAll()
    expect(actual).to.deep.eq([
      { key: '1', value: 'one' },
      { key: '2', value: 'two' },
      { key: '3', value: 'three' },
    ])

    await kvStore.deleteAll()
    actual = await kvStore.getAll()
    expect(actual).to.deep.eq([])
  })

  // it constrains key type to generic parameter passed to constructor
  type _ = AssertTrue<
    IsExact<Parameters<typeof kvStore['set']>[0], '1' | '2' | '3' | 'key'>
  >
})
