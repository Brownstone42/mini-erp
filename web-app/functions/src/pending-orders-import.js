import { createHash, randomUUID } from 'node:crypto'
import { HttpsError } from 'firebase-functions/v2/https'
import { buildPendingOrdersPreview } from './pending-orders-preview.js'

const ADMIN_EMAILS = new Set(['anawatbooch@gmail.com', 'idealglobe.account@gmail.com'])

export function assertPendingOrdersImportAdmin(auth) {
  const email = auth?.token?.email?.toLowerCase()
  if (!auth || !email || !ADMIN_EMAILS.has(email)) throw new HttpsError('permission-denied', 'บัญชีนี้ไม่มีสิทธิ์ Import Pending Orders')
}

export async function importPendingOrdersSnapshot(options) {
  const preview = buildPendingOrdersPreview(options)
  if (!preview.isValid) throw new HttpsError('failed-precondition', 'ไฟล์ไม่ผ่าน Validation กรุณาตรวจสอบ Preview อีกครั้ง')
  if (preview.previewId !== options.previewId) throw new HttpsError('failed-precondition', 'ไฟล์ไม่ตรงกับ Preview กรุณาตรวจสอบไฟล์อีกครั้ง')

  const duplicate = await options.findImportByHash(preview.previewId)
  const previous = duplicate.data?.pendingOrderSnapshots?.[0]
  if (previous) return { snapshotId: previous.id, importedAt: previous.importedAt, summary: preview.summary, alreadyImported: true }

  const snapshotId = randomUUID()
  const now = new Date().toISOString()
  const key = (type, sourceRowNumber) => createHash('sha256').update(`${preview.previewId}|${type}|${sourceRowNumber}`).digest('hex')
  const snapshot = {
    id: snapshotId,
    sourceFileName: options.fileName,
    sourceFileHash: preview.previewId,
    reportDate: preview.reportDate,
    periodStart: preview.periodStart,
    periodEnd: preview.periodEnd,
    warehouseFrom: preview.warehouseFrom,
    warehouseTo: preview.warehouseTo,
    customerFrom: preview.customerFrom,
    customerTo: preview.customerTo,
    lineCount: preview.summary.totalRows,
    productCount: preview.summary.productCount,
    unitMismatchCount: preview.summary.unitMismatchCount,
    importedByUid: options.importedByUid,
    importedAt: now
  }
  const lines = preview.rows.map((row) => ({
    sourceKey: key('line', row.sourceRowNumber), snapshotId,
    sourceRowNumber: row.sourceRowNumber, productCode: row.productCode, sourceProductName: row.productName,
    warehouseCode: row.warehouseCode, deliveryDate: row.deliveryDate, documentNumber: row.documentNumber,
    orderDate: row.orderDate, customerName: row.customerName, orderedQuantity: row.orderedQuantity,
    sourceUnitText: row.sourceUnitText, pendingQuantity: row.pendingQuantity, amount: row.amount
  }))
  const products = preview.products.map((product) => ({
    sourceKey: key('product', product.sourceRowNumber), snapshotId,
    sourceRowNumber: product.sourceRowNumber, productCode: product.productCode, sourceProductName: product.productName,
    orderedQuantity: product.subtotal.orderedQuantity, pendingQuantity: product.subtotal.pendingQuantity,
    amount: product.subtotal.amount, reportedOnHandQuantity: product.subtotal.reportedOnHandQuantity,
    reportedOnHandUnitText: product.subtotal.reportedOnHandUnitText,
    reportedPurchaseQuantity: product.subtotal.reportedPurchaseQuantity
  }))
  await options.dataConnect.executeMutation('AdminImportPendingOrderSnapshot', { snapshot, lines, products })
  return { snapshotId, importedAt: now, summary: preview.summary, alreadyImported: false }
}
