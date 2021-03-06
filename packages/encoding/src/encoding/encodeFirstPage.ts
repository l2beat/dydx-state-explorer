import { OnChainData } from '../OnChainData'
import { ByteWriter } from './ByteWriter'
import { encodeForcedActions } from './encodeForcedActions'
import { writeAssetConfigHashes } from './writeAssetConfigHashes'
import { writeConditions } from './writeConditions'
import { writeModifications } from './writeModifications'
import { writeState } from './writeState'

export function encodeFirstPage(data: OnChainData) {
  const writer = new ByteWriter()

  writer.write(data.configurationHash.toString(), 32)

  writeAssetConfigHashes(writer, data.assetConfigHashes)

  writeState(writer, data.oldState)
  writeState(writer, data.newState)

  writer.writeNumber(data.minimumExpirationTimestamp, 32)

  writeModifications(writer, data.modifications)

  const forcedActionsBytes = encodeForcedActions(data.forcedActions)
  writer.writeNumber(forcedActionsBytes.length / 2 / 32, 32)
  writer.write(forcedActionsBytes)

  writeConditions(writer, data.conditions)

  return writer.getBytes()
}
