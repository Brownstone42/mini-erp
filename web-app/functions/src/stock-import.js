import { randomUUID } from 'node:crypto'
import { HttpsError } from 'firebase-functions/v2/https'
import { buildStockPreview } from './stock-preview.js'

const ADMIN_EMAILS = new Set(['anawatbooch@gmail.com'])

export function assertStockImportAdmin(auth) {
  const email = auth?.token?.email?.toLowerCase()
  if (!auth || !email || !ADMIN_EMAILS.has(email)) throw new HttpsError('permission-denied', 'บัญชีนี้ไม่มีสิทธิ์ Import Stock')
}

export async function importStockSnapshot(options) {
  const preview = buildStockPreview(options)
  if (!preview.isValid) throw new HttpsError('failed-precondition', 'ไฟล์ไม่ผ่าน Validation กรุณาตรวจสอบ Preview อีกครั้ง')
  if (preview.previewId !== options.previewId) throw new HttpsError('failed-precondition', 'ไฟล์ไม่ตรงกับ Preview กรุณาตรวจสอบไฟล์อีกครั้ง')
  const duplicate = await options.findImportByHash(preview.previewId)
  const previous = duplicate.data?.stockImportRuns?.[0]
  if (previous) return { importId: previous.id, importedAt: previous.importedAt, summary: preview.summary, alreadyImported: true }

  const importId = randomUUID()
  const now = new Date().toISOString()
  const rows = preview.rows.map((row) => ({
    sourceKey: row.sourceKey, snapshotDate: row.snapshotDate, warehouseFrom: row.warehouseFrom, warehouseTo: row.warehouseTo,
    productCode: row.productCode, sourceProductName: row.sourceProductName, quantity: row.quantity,
    sourceUnitText: row.sourceUnitText, unitCost: row.unitCost, inventoryValue: row.inventoryValue,
    lotMismatch: row.lotMismatch, isActive: true, lastImportId: importId, updatedAt: now
  }))
  const lots = preview.lots.map((lot) => ({
    sourceKey: lot.sourceKey, snapshotKey: lot.snapshotKey, snapshotDate: lot.snapshotDate,
    warehouseFrom: lot.warehouseFrom, warehouseTo: lot.warehouseTo, productCode: lot.productCode,
    sourceOccurrence: lot.sourceOccurrence, receivedDate: lot.receivedDate, lotReference: lot.lotReference,
    quantity: lot.quantity, unitCost: lot.unitCost, inventoryValue: lot.inventoryValue,
    isActive: true, lastImportId: importId, updatedAt: now
  }))
  await options.dataConnect.executeMutation('AdminImportStockSnapshot', {
    rows, lots, sourceKeys: rows.map((row) => row.sourceKey), lotSourceKeys: lots.map((lot) => lot.sourceKey),
    snapshotDate: preview.snapshotDate, warehouseFrom: preview.warehouseFrom, warehouseTo: preview.warehouseTo,
    importId, now,
    importRun: {
      id: importId, sourceFileName: options.fileName, sourceFileHash: preview.previewId,
      snapshotDate: preview.snapshotDate, warehouseFrom: preview.warehouseFrom, warehouseTo: preview.warehouseTo,
      totalRows: preview.summary.totalRows, lotRows: preview.summary.lotRows,
      lotMismatchCount: preview.summary.lotMismatchCount, createdCount: preview.summary.createCount,
      updatedCount: preview.summary.updateCount, unchangedCount: preview.summary.unchangedCount,
      deactivatedCount: preview.summary.deactivateCount, importedByUid: options.importedByUid, importedAt: now
    }
  })
  return { importId, importedAt: now, summary: preview.summary, alreadyImported: false }
}
