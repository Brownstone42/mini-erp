import { randomUUID } from 'node:crypto'
import { HttpsError } from 'firebase-functions/v2/https'
import { adminGetImportRunByHash } from './dataconnect-admin-generated/esm/index.esm.js'
import { buildSupplierPreview } from './supplier-preview.js'

const ADMIN_EMAILS = new Set(['anawatbooch@gmail.com'])

export function assertSupplierImportAdmin(auth) {
  const email = auth?.token?.email?.toLowerCase()
  if (!auth || !email || !ADMIN_EMAILS.has(email)) {
    throw new HttpsError('permission-denied', 'บัญชีนี้ไม่มีสิทธิ์ Import Supplier')
  }
}

export async function importSupplierSnapshot({
  dataConnect,
  fileName,
  fileBuffer,
  previewId,
  importedByUid,
  existingSuppliers,
  findImportByHash = adminGetImportRunByHash
}) {
  const preview = buildSupplierPreview({ fileName, fileBuffer, existingSuppliers })
  if (!preview.isValid) {
    throw new HttpsError('failed-precondition', 'ไฟล์ไม่ผ่าน Validation กรุณาตรวจสอบ Preview อีกครั้ง')
  }
  if (preview.previewId !== previewId) {
    throw new HttpsError('failed-precondition', 'ไฟล์ไม่ตรงกับ Preview กรุณาตรวจสอบไฟล์อีกครั้ง')
  }

  const duplicate = await findImportByHash({ sourceFileHash: preview.previewId })
  const previousImport = duplicate.data?.supplierImportRuns?.[0]
  if (previousImport) {
    return {
      importId: previousImport.id,
      importedAt: previousImport.importedAt,
      summary: preview.summary,
      alreadyImported: true
    }
  }

  const importId = randomUUID()
  const now = new Date().toISOString()
  const suppliers = preview.rows.map((row) => ({
    supplierCode: row.supplierCode,
    supplierName: row.supplierName,
    supplierType: row.supplierType,
    creditDays: row.creditDays,
    creditLimit: row.creditLimit,
    expressAccountCode: row.expressAccountCode,
    addressText: row.addressText,
    phoneText: row.phoneText,
    contactName: row.contactName,
    taxId: row.taxId,
    email: row.email,
    branchName: row.branchName,
    isActive: true,
    lastImportId: importId,
    updatedAt: now
  }))
  const variables = {
    suppliers,
    supplierCodes: suppliers.map((supplier) => supplier.supplierCode),
    importId,
    now,
    importRun: {
      id: importId,
      sourceFileName: fileName,
      sourceFileHash: preview.previewId,
      totalRows: preview.summary.totalRows,
      createdCount: preview.summary.createCount,
      updatedCount: preview.summary.updateCount,
      reactivatedCount: preview.summary.reactivateCount,
      deactivatedCount: preview.summary.deactivateCount,
      importedByUid,
      importedAt: now
    }
  }

  await dataConnect.executeMutation('AdminImportSuppliers', variables)
  return { importId, importedAt: now, summary: preview.summary, alreadyImported: false }
}
