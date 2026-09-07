import { createHash } from 'node:crypto'
import { parseExpressSalesHistory } from './sales-history-parser.js'

const COMPARED_FIELDS = [
  'transactionDate', 'documentNumber', 'sourceQuantity', 'sourceUnitText', 'isReturn',
  'unitPrice', 'sourceVatCode', 'lineDiscountText', 'grossAmount', 'overallDiscountText',
  'netAmount', 'referenceText', 'noteText', 'salesFactor', 'analysisQuantity', 'analysisNetAmount'
]

function comparable(value) {
  return value === undefined || value === '' ? null : value
}

export function buildSalesHistoryPreview({ fileName, fileBuffer, existingRows = [], products = [], customerCodes = [] }) {
  const parsed = parseExpressSalesHistory(fileBuffer)
  const errors = [...parsed.errors]
  const productMap = new Map(products.map((product) => [product.productCode, product]))
  const validCustomers = new Set(customerCodes)
  const existingMap = new Map(existingRows.map((row) => [row.sourceKey, row]))
  const incomingKeys = new Set(parsed.rows.map((row) => row.sourceKey))
  const summary = {
    totalRows: parsed.rows.length, createCount: 0, updateCount: 0,
    unchangedCount: 0, deactivateCount: 0, returnCount: 0, errorCount: 0
  }

  const rows = parsed.rows.map((row) => {
    const product = productMap.get(row.productCode)
    if (!product) errors.push({ rowNumber: row.sourceRowNumber, field: 'productCode', message: `ไม่พบ Product ${row.productCode} ใน Product Master Data` })
    if (!validCustomers.has(row.customerCode)) errors.push({ rowNumber: row.sourceRowNumber, field: 'customerCode', message: `ไม่พบ Customer ${row.customerCode} ใน Customer Master Data` })
    const salesFactor = product?.salesFactor ?? 1
    const normalized = {
      ...row,
      salesFactor,
      analysisQuantity: row.signedSourceQuantity == null ? null : row.signedSourceQuantity * salesFactor,
      analysisNetAmount: row.signedNetAmount
    }
    const existing = existingMap.get(row.sourceKey)
    let changeType = 'unchanged'
    if (!existing) changeType = 'create'
    else if (existing.isActive === false || existing.product?.productCode !== row.productCode || existing.customer?.customerCode !== row.customerCode || COMPARED_FIELDS.some((field) => comparable(normalized[field]) !== comparable(existing[field]))) changeType = 'update'
    summary[`${changeType}Count`] += 1
    if (row.isReturn) summary.returnCount += 1
    return { ...normalized, changeType }
  })

  summary.deactivateCount = existingRows.filter((row) => row.isActive && !incomingKeys.has(row.sourceKey)).length
  summary.errorCount = errors.length
  return {
    previewId: createHash('sha256').update(fileBuffer).digest('hex'),
    fileName, periodStart: parsed.periodStart, periodEnd: parsed.periodEnd,
    isValid: errors.length === 0, summary, errors, rows
  }
}
