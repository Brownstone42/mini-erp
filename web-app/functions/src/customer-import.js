import { randomUUID } from 'node:crypto'
import { HttpsError } from 'firebase-functions/v2/https'
import { buildCustomerPreview } from './customer-preview.js'

const ADMIN_EMAILS = new Set(['anawatbooch@gmail.com'])

export function assertCustomerImportAdmin(auth) {
  const email = auth?.token?.email?.toLowerCase()
  if (!auth || !email || !ADMIN_EMAILS.has(email)) {
    throw new HttpsError('permission-denied', 'บัญชีนี้ไม่มีสิทธิ์ Import Customer')
  }
}

export async function importCustomerSnapshot({
  dataConnect,
  fileName,
  fileBuffer,
  previewId,
  importedByUid,
  existingCustomers,
  findImportByHash
}) {
  const preview = buildCustomerPreview({ fileName, fileBuffer, existingCustomers })
  if (!preview.isValid) {
    throw new HttpsError('failed-precondition', 'ไฟล์ไม่ผ่าน Validation กรุณาตรวจสอบ Preview อีกครั้ง')
  }
  if (preview.previewId !== previewId) {
    throw new HttpsError('failed-precondition', 'ไฟล์ไม่ตรงกับ Preview กรุณาตรวจสอบไฟล์อีกครั้ง')
  }

  const duplicate = await findImportByHash(preview.previewId)
  const previousImport = duplicate.data?.customerImportRuns?.[0]
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
  const customers = preview.rows.map((row) => ({
    customerCode: row.customerCode,
    customerName: row.customerName,
    customerType: row.customerType,
    salespersonCode: row.salespersonCode,
    salesTerritory: row.salesTerritory,
    priceType: row.priceType,
    addressText: row.addressText,
    postalCode: row.postalCode,
    contactName: row.contactName,
    expressAccountCode: row.expressAccountCode,
    shippingMethod: row.shippingMethod,
    creditDays: row.creditDays,
    creditLimit: row.creditLimit,
    phoneText: row.phoneText,
    paymentTerms: row.paymentTerms,
    taxId: row.taxId,
    branchName: row.branchName,
    email: row.email,
    noteText: row.noteText,
    isActive: true,
    lastImportId: importId,
    updatedAt: now
  }))
  const variables = {
    customers,
    customerCodes: customers.map((customer) => customer.customerCode),
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

  await dataConnect.executeMutation('AdminImportCustomers', variables)
  return { importId, importedAt: now, summary: preview.summary, alreadyImported: false }
}
