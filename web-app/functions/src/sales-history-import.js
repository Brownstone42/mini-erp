import { randomUUID } from 'node:crypto'
import { HttpsError } from 'firebase-functions/v2/https'
import { buildSalesHistoryPreview } from './sales-history-preview.js'

const ADMIN_EMAILS = new Set(['anawatbooch@gmail.com'])

export function assertSalesHistoryImportAdmin(auth) {
  const email = auth?.token?.email?.toLowerCase()
  if (!auth || !email || !ADMIN_EMAILS.has(email)) {
    throw new HttpsError('permission-denied', 'บัญชีนี้ไม่มีสิทธิ์ Import Sales History')
  }
}

export async function importSalesHistorySnapshot(options) {
  const preview = buildSalesHistoryPreview(options)
  if (!preview.isValid) throw new HttpsError('failed-precondition', 'ไฟล์ไม่ผ่าน Validation กรุณาตรวจสอบ Preview อีกครั้ง')
  if (preview.previewId !== options.previewId) throw new HttpsError('failed-precondition', 'ไฟล์ไม่ตรงกับ Preview กรุณาตรวจสอบไฟล์อีกครั้ง')
  const duplicate = await options.findImportByHash(preview.previewId)
  const previous = duplicate.data?.salesHistoryImportRuns?.[0]
  if (previous) return { importId: previous.id, importedAt: previous.importedAt, summary: preview.summary, alreadyImported: true }

  const importId = randomUUID()
  const now = new Date().toISOString()
  const rows = preview.rows.map((row) => ({
    sourceKey: row.sourceKey, sourceOccurrence: row.sourceOccurrence, transactionDate: row.transactionDate,
    documentNumber: row.documentNumber, productCode: row.productCode, customerCode: row.customerCode,
    sourceQuantity: row.sourceQuantity, sourceUnitText: row.sourceUnitText, isReturn: row.isReturn,
    unitPrice: row.unitPrice, sourceVatCode: row.sourceVatCode, lineDiscountText: row.lineDiscountText,
    grossAmount: row.grossAmount, overallDiscountText: row.overallDiscountText, netAmount: row.netAmount,
    referenceText: row.referenceText, noteText: row.noteText, salesFactor: row.salesFactor,
    analysisQuantity: row.analysisQuantity, analysisNetAmount: row.analysisNetAmount,
    isActive: true, lastImportId: importId, updatedAt: now
  }))
  await options.dataConnect.executeMutation('AdminImportSalesHistory', {
    rows, sourceKeys: rows.map((row) => row.sourceKey), periodStart: preview.periodStart, periodEnd: preview.periodEnd,
    importId, now,
    importRun: { id: importId, sourceFileName: options.fileName, sourceFileHash: preview.previewId,
      periodStart: preview.periodStart, periodEnd: preview.periodEnd, totalRows: preview.summary.totalRows,
      createdCount: preview.summary.createCount, updatedCount: preview.summary.updateCount,
      unchangedCount: preview.summary.unchangedCount, deactivatedCount: preview.summary.deactivateCount,
      importedByUid: options.importedByUid, importedAt: now }
  })
  return { importId, importedAt: now, summary: preview.summary, alreadyImported: false }
}
