import { createHash } from 'node:crypto'
import { parseExpressStock } from './stock-parser.js'

const ROW_FIELDS = ['snapshotDate', 'warehouseFrom', 'warehouseTo', 'productCode', 'sourceProductName', 'quantity', 'sourceUnitText', 'unitCost', 'inventoryValue', 'lotMismatch']
const LOT_FIELDS = ['snapshotKey', 'snapshotDate', 'warehouseFrom', 'warehouseTo', 'productCode', 'sourceOccurrence', 'receivedDate', 'lotReference', 'quantity', 'unitCost', 'inventoryValue']
const comparable = (value) => value === undefined || value === '' ? null : value

function changeType(incoming, existing, fields) {
  if (!existing) return 'create'
  if (existing.isActive === false || fields.some((field) => comparable(incoming[field]) !== comparable(existing[field]))) return 'update'
  return 'unchanged'
}

export function buildStockPreview({ fileName, fileBuffer, existingRows = [], existingLots = [], products = [] }) {
  const parsed = parseExpressStock(fileBuffer)
  const errors = [...parsed.errors]
  const productCodes = new Set(products.map((item) => item.productCode))
  const existingMap = new Map(existingRows.map((item) => [item.sourceKey, item]))
  const existingLotMap = new Map(existingLots.map((item) => [item.sourceKey, item]))
  const incomingKeys = new Set(parsed.rows.map((item) => item.sourceKey))
  const incomingLotKeys = new Set(parsed.lots.map((item) => item.sourceKey))
  const summary = {
    totalRows: parsed.rows.length, lotRows: parsed.lots.length, createCount: 0, updateCount: 0, unchangedCount: 0,
    deactivateCount: 0, lotCreateCount: 0, lotUpdateCount: 0, lotUnchangedCount: 0, lotDeactivateCount: 0,
    lotMismatchCount: parsed.rows.filter((row) => row.lotMismatch).length,
    negativeCount: parsed.rows.filter((row) => row.quantity < 0).length,
    zeroCount: parsed.rows.filter((row) => row.quantity === 0).length,
    totalInventoryValue: parsed.rows.reduce((total, row) => total + (row.inventoryValue || 0), 0), errorCount: 0
  }
  const rows = parsed.rows.map((row) => {
    if (!productCodes.has(row.productCode)) errors.push({ rowNumber: row.sourceRowNumber, field: 'productCode', message: `ไม่พบ Product ${row.productCode} ใน Product Master Data` })
    const normalized = { ...row, sourceProductName: row.productName }
    const type = changeType(normalized, existingMap.get(row.sourceKey), ROW_FIELDS)
    summary[`${type}Count`] += 1
    return { ...normalized, changeType: type, lotCount: parsed.lots.filter((lot) => lot.productCode === row.productCode).length }
  })
  const lots = parsed.lots.map((lot) => {
    const type = changeType(lot, existingLotMap.get(lot.sourceKey), LOT_FIELDS)
    summary[`lot${type[0].toUpperCase()}${type.slice(1)}Count`] += 1
    return { ...lot, changeType: type }
  })
  summary.deactivateCount = existingRows.filter((item) => item.isActive && !incomingKeys.has(item.sourceKey)).length
  summary.lotDeactivateCount = existingLots.filter((item) => item.isActive && !incomingLotKeys.has(item.sourceKey)).length
  summary.errorCount = errors.length
  return {
    previewId: createHash('sha256').update(fileBuffer).digest('hex'), fileName,
    snapshotDate: parsed.snapshotDate, warehouseFrom: parsed.warehouseFrom, warehouseTo: parsed.warehouseTo,
    isValid: !errors.length, summary, warnings: parsed.warnings, errors, rows, lots
  }
}
