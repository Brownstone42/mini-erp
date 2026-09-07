import { createHash } from 'node:crypto'
import { parseExpressPurchaseHistory } from './purchase-history-parser.js'

const FIELDS = ['transactionDate', 'documentNumber', 'sourceQuantity', 'sourceUnitText', 'isReturn', 'unitPrice', 'sourceVatCode', 'lineDiscountText', 'grossAmount', 'overallDiscountText', 'netAmount', 'referenceText', 'purchaseFactor', 'analysisQuantity', 'analysisNetAmount']
const comparable = (value) => value === undefined || value === '' ? null : value

export function buildPurchaseHistoryPreview({ fileName, fileBuffer, existingRows = [], products = [], supplierCodes = [] }) {
  const parsed = parseExpressPurchaseHistory(fileBuffer)
  const errors = [...parsed.errors]
  const productMap = new Map(products.map((item) => [item.productCode, item]))
  const validSuppliers = new Set(supplierCodes)
  const existingMap = new Map(existingRows.map((item) => [item.sourceKey, item]))
  const incomingKeys = new Set(parsed.rows.map((item) => item.sourceKey))
  const summary = { totalRows: parsed.rows.length, createCount: 0, updateCount: 0, unchangedCount: 0, deactivateCount: 0, returnCount: 0, errorCount: 0 }
  const rows = parsed.rows.map((row) => {
    const product = productMap.get(row.productCode)
    if (!product) errors.push({ rowNumber: row.sourceRowNumber, field: 'productCode', message: `ไม่พบ Product ${row.productCode} ใน Product Master Data` })
    if (!validSuppliers.has(row.supplierCode)) errors.push({ rowNumber: row.sourceRowNumber, field: 'supplierCode', message: `ไม่พบ Supplier ${row.supplierCode} ใน Supplier Master Data` })
    const purchaseFactor = product?.purchaseFactor ?? 1
    const normalized = { ...row, purchaseFactor, analysisQuantity: row.signedSourceQuantity == null ? null : row.signedSourceQuantity * purchaseFactor, analysisNetAmount: row.signedNetAmount }
    const existing = existingMap.get(row.sourceKey)
    let changeType = 'unchanged'
    if (!existing) changeType = 'create'
    else if (existing.isActive === false || existing.product?.productCode !== row.productCode || existing.supplier?.supplierCode !== row.supplierCode || FIELDS.some((field) => comparable(normalized[field]) !== comparable(existing[field]))) changeType = 'update'
    summary[`${changeType}Count`] += 1
    if (row.isReturn) summary.returnCount += 1
    return { ...normalized, changeType }
  })
  summary.deactivateCount = existingRows.filter((item) => item.isActive && !incomingKeys.has(item.sourceKey)).length
  summary.errorCount = errors.length
  return { previewId: createHash('sha256').update(fileBuffer).digest('hex'), fileName, periodStart: parsed.periodStart, periodEnd: parsed.periodEnd, isValid: !errors.length, summary, errors, rows }
}
