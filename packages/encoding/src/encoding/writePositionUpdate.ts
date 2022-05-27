import { MIN_INT } from '../constants'
import { PositionUpdate } from '../OnChainData'
import { ByteWriter } from './ByteWriter'
import { encodeAssetId } from './encodeAssetId'

export function writePositionUpdate(
  writer: ByteWriter,
  position: PositionUpdate
) {
  writer.writeNumber(position.balances.length + 4, 32)
  writer.writeNumber(position.positionId, 32)
  writer.write(position.publicKey.toString(), 32)
  writer.writeNumber(position.collateralBalance - MIN_INT, 32)
  writer.writeNumber(Number(position.fundingTimestamp) / 1000, 32)

  for (const { assetId, balance } of position.balances) {
    writer.writePadding(9)
    writer.write(encodeAssetId(assetId), 15)
    writer.writeNumber(balance - MIN_INT, 8)
  }
}
