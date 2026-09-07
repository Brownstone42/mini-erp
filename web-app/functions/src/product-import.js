import { randomUUID } from 'node:crypto'
import { HttpsError } from 'firebase-functions/v2/https'
import { buildProductPreview } from './product-preview.js'

const ADMIN_EMAILS = new Set(['anawatbooch@gmail.com'])

export function assertProductImportAdmin(auth) {
  const email = auth?.token?.email?.toLowerCase()
  if (!auth || !email || !ADMIN_EMAILS.has(email)) {
    throw new HttpsError('permission-denied', 'บัญชีนี้ไม่มีสิทธิ์ Import Product')
  }
}

export async function importProductSnapshot({
  dataConnect,
  fileName,
  fileBuffer,
  previewId,
  importedByUid,
  existingProducts,
  existingCategories,
  supplierCodes,
  findImportByHash
}) {
  const preview = buildProductPreview({ fileName, fileBuffer, existingProducts, existingCategories, supplierCodes })
  if (!preview.isValid) throw new HttpsError('failed-precondition', 'ไฟล์ไม่ผ่าน Validation กรุณาตรวจสอบ Preview อีกครั้ง')
  if (preview.previewId !== previewId) throw new HttpsError('failed-precondition', 'ไฟล์ไม่ตรงกับ Preview กรุณาตรวจสอบไฟล์อีกครั้ง')

  const duplicate = await findImportByHash(preview.previewId)
  const previousImport = duplicate.data?.productImportRuns?.[0]
  if (previousImport) {
    return { importId: previousImport.id, importedAt: previousImport.importedAt, summary: preview.summary, alreadyImported: true }
  }

  const importId = randomUUID()
  const now = new Date().toISOString()
  const categories = preview.categories.map((item) => ({
    categoryCode: item.categoryCode,
    categoryName: item.categoryName,
    isActive: true,
    lastImportId: importId,
    updatedAt: now
  }))
  const products = preview.rows.map((item) => ({
    productCode: item.productCode,
    productName: item.productName,
    largeDescription: item.largeDescription,
    categoryCode: item.categoryCode,
    supplierCode: item.supplierCode,
    smallUnit: item.smallUnit,
    largeUnit: item.largeUnit,
    purchaseUnit: item.purchaseUnit,
    purchaseFactor: item.purchaseFactor,
    salesUnit: item.salesUnit,
    salesFactor: item.salesFactor,
    accountCode: item.accountCode,
    standardPrice: item.standardPrice,
    replacementText: item.replacementText,
    isActive: true,
    lastImportId: importId,
    updatedAt: now
  }))
  const variables = {
    categories,
    products,
    categoryCodes: categories.map((item) => item.categoryCode),
    productCodes: products.map((item) => item.productCode),
    importId,
    now,
    importRun: {
      id: importId,
      sourceFileName: fileName,
      sourceFileHash: preview.previewId,
      totalRows: preview.summary.totalRows,
      categoryRows: preview.summary.categoryRows,
      createdCount: preview.summary.createCount,
      updatedCount: preview.summary.updateCount,
      reactivatedCount: preview.summary.reactivateCount,
      deactivatedCount: preview.summary.deactivateCount,
      importedByUid,
      importedAt: now
    }
  }

  await dataConnect.executeMutation('AdminImportProducts', variables)
  return { importId, importedAt: now, summary: preview.summary, alreadyImported: false }
}
