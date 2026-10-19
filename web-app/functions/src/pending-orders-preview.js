import { createHash } from 'node:crypto'
import { parseExpressPendingOrders } from './pending-orders-parser.js'

export function buildPendingOrdersPreview({ fileName, fileBuffer, products = [], existingSnapshot = null }) {
  const parsed = parseExpressPendingOrders(fileBuffer)
  const errors = [...parsed.errors]
  const warnings = [...parsed.warnings]
  const productCodes = new Set(products.map((product) => product.productCode))
  const missingCodes = parsed.products.map((product) => product.productCode).filter((code) => !productCodes.has(code))
  for (const productCode of missingCodes) {
    warnings.push({ field: 'productCode', productCode, message: `ไม่พบรหัส ${productCode} ใน Product Master Data เก็บรหัสตามไฟล์ Express โดยยังไม่จับคู่สินค้า` })
  }
  if (parsed.rows.length > 5000 || parsed.products.length > 5000) {
    errors.push({ rowNumber: null, field: 'file', message: 'รายงานมีรายการมากกว่า 5,000 รายการ กรุณาแบ่งไฟล์ก่อน Import' })
  }
  const summary = {
    totalRows: parsed.rows.length,
    productCount: parsed.products.length,
    unitMismatchCount: warnings.filter((warning) => warning.field === 'unit').length,
    unmatchedProductCount: missingCodes.length,
    errorCount: errors.length
  }
  return {
    previewId: createHash('sha256').update(fileBuffer).digest('hex'),
    fileName,
    reportDate: parsed.reportDate,
    periodStart: parsed.periodStart,
    periodEnd: parsed.periodEnd,
    warehouseFrom: parsed.warehouseFrom,
    warehouseTo: parsed.warehouseTo,
    customerFrom: parsed.customerFrom,
    customerTo: parsed.customerTo,
    alreadyImported: Boolean(existingSnapshot),
    existingSnapshotId: existingSnapshot?.id || null,
    isValid: errors.length === 0,
    summary,
    warnings,
    errors,
    rows: parsed.rows,
    products: parsed.products.map((product) => ({
      productCode: product.productCode, productName: product.productName,
      sourceRowNumber: product.sourceRowNumber, subtotal: product.subtotal
    }))
  }
}
