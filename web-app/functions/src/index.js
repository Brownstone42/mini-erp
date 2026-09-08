import { initializeApp } from 'firebase-admin/app'
import { getDataConnect } from 'firebase-admin/data-connect'
import { setGlobalOptions } from 'firebase-functions/v2'
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https'
import { adminListSuppliers } from './dataconnect-admin-generated/esm/index.esm.js'
import { buildSupplierPreview } from './supplier-preview.js'
import { buildCustomerPreview } from './customer-preview.js'
import { assertCustomerImportAdmin, importCustomerSnapshot } from './customer-import.js'
import { assertSupplierImportAdmin, importSupplierSnapshot } from './supplier-import.js'
import { buildProductPreview } from './product-preview.js'
import { assertProductImportAdmin, importProductSnapshot } from './product-import.js'
import { buildSalesHistoryPreview } from './sales-history-preview.js'
import { parseExpressSalesHistory } from './sales-history-parser.js'
import { assertSalesHistoryImportAdmin, importSalesHistorySnapshot } from './sales-history-import.js'
import { parseExpressPurchaseHistory } from './purchase-history-parser.js'
import { buildPurchaseHistoryPreview } from './purchase-history-preview.js'
import { assertPurchaseHistoryImportAdmin, importPurchaseHistorySnapshot } from './purchase-history-import.js'
import { parseExpressStock } from './stock-parser.js'
import { buildStockPreview } from './stock-preview.js'
import { assertStockImportAdmin, importStockSnapshot } from './stock-import.js'

initializeApp()

const dataConnect = getDataConnect({
  connector: 'supplier-admin',
  serviceId: 'mini-erp-service',
  location: 'asia-southeast1'
})

setGlobalOptions({
  region: 'asia-southeast1',
  maxInstances: 10
})

const SALES_HISTORY_QUERY_PAGE_SIZE = 6000

async function listAllSalesHistoryForPeriod(periodStart, periodEnd) {
  const rows = []
  for (let offset = 0; ; offset += SALES_HISTORY_QUERY_PAGE_SIZE) {
    const result = await dataConnect.executeQuery('AdminListSalesHistoryForPeriod', {
      periodStart,
      periodEnd,
      limit: SALES_HISTORY_QUERY_PAGE_SIZE,
      offset
    })
    const page = result.data?.salesHistoryLines || []
    rows.push(...page)
    if (page.length < SALES_HISTORY_QUERY_PAGE_SIZE) return rows
  }
}

export const health = onRequest({ cors: false }, (request, response) => {
  response.json({
    service: 'mini-erp-functions',
    status: 'ok'
  })
})

export const previewSupplierImport = onCall({ cors: true }, async (request) => {
  if (!request.auth || request.auth.token.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('unauthenticated', 'กรุณาเข้าสู่ระบบก่อนตรวจสอบไฟล์')
  }

  const { fileName, fileBase64 } = request.data || {}
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv')) {
    throw new HttpsError('invalid-argument', 'กรุณาเลือกไฟล์ CSV จาก Express')
  }
  if (typeof fileBase64 !== 'string' || fileBase64.length === 0) {
    throw new HttpsError('invalid-argument', 'ไม่พบข้อมูลในไฟล์')
  }
  if (fileBase64.length > 3_000_000) {
    throw new HttpsError('invalid-argument', 'ไฟล์มีขนาดใหญ่เกิน 2 MB')
  }

  try {
    const existingResult = await adminListSuppliers({ limit: 2000, offset: 0 })
    const existingSuppliers = existingResult.data?.suppliers || []
    return buildSupplierPreview({
      fileName: fileName.trim(),
      fileBuffer: Buffer.from(fileBase64, 'base64'),
      existingSuppliers
    })
  } catch (error) {
    if (error instanceof HttpsError) throw error
    console.error('Supplier preview failed', error)
    throw new HttpsError('internal', 'ไม่สามารถตรวจสอบไฟล์ Supplier ได้')
  }
})

export const previewCustomerImport = onCall({ cors: true }, async (request) => {
  if (!request.auth || request.auth.token.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('unauthenticated', 'กรุณาเข้าสู่ระบบก่อนตรวจสอบไฟล์')
  }
  const { fileName, fileBase64 } = request.data || {}
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv')) {
    throw new HttpsError('invalid-argument', 'กรุณาเลือกไฟล์ CSV จาก Express')
  }
  if (typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 3_000_000) {
    throw new HttpsError('invalid-argument', 'ข้อมูลไฟล์ไม่ถูกต้องหรือไฟล์มีขนาดใหญ่เกิน 2 MB')
  }

  try {
    const existingResult = await dataConnect.executeQuery('AdminListCustomers', { limit: 1100, offset: 0 })
    return buildCustomerPreview({
      fileName: fileName.trim(),
      fileBuffer: Buffer.from(fileBase64, 'base64'),
      existingCustomers: existingResult.data?.customers || []
    })
  } catch (error) {
    console.error('Customer preview failed', error)
    throw new HttpsError('internal', 'ไม่สามารถตรวจสอบไฟล์ Customer ได้')
  }
})

export const previewProductImport = onCall({ cors: true, timeoutSeconds: 120 }, async (request) => {
  if (!request.auth || request.auth.token.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('unauthenticated', 'กรุณาเข้าสู่ระบบก่อนตรวจสอบไฟล์')
  }
  const { fileName, fileBase64 } = request.data || {}
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv')) {
    throw new HttpsError('invalid-argument', 'กรุณาเลือกไฟล์ CSV Product จาก Express')
  }
  if (typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 3_000_000) {
    throw new HttpsError('invalid-argument', 'ข้อมูลไฟล์ไม่ถูกต้องหรือไฟล์มีขนาดใหญ่เกิน 2 MB')
  }

  try {
    const [productResult, categoryResult, supplierResult] = await Promise.all([
      dataConnect.executeQuery('AdminListProducts', { limit: 2000, offset: 0 }),
      dataConnect.executeQuery('AdminListProductCategories', { limit: 100, offset: 0 }),
      adminListSuppliers({ limit: 2000, offset: 0 })
    ])
    return buildProductPreview({
      fileName: fileName.trim(),
      fileBuffer: Buffer.from(fileBase64, 'base64'),
      existingProducts: productResult.data?.products || [],
      existingCategories: categoryResult.data?.productCategories || [],
      supplierCodes: (supplierResult.data?.suppliers || []).map((supplier) => supplier.supplierCode)
    })
  } catch (error) {
    console.error('Product preview failed', error)
    throw new HttpsError('internal', 'ไม่สามารถตรวจสอบไฟล์ Product ได้')
  }
})

export const previewSalesHistoryImport = onCall({ cors: true, timeoutSeconds: 120 }, async (request) => {
  if (!request.auth || request.auth.token.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('unauthenticated', 'กรุณาเข้าสู่ระบบก่อนตรวจสอบไฟล์')
  }
  const { fileName, fileBase64 } = request.data || {}
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv')) {
    throw new HttpsError('invalid-argument', 'กรุณาเลือกไฟล์ CSV Sales History จาก Express')
  }
  if (typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 3_000_000) {
    throw new HttpsError('invalid-argument', 'ข้อมูลไฟล์ไม่ถูกต้องหรือไฟล์มีขนาดใหญ่เกิน 2 MB')
  }

  try {
    const fileBuffer = Buffer.from(fileBase64, 'base64')
    const parsed = parseExpressSalesHistory(fileBuffer)
    if (!parsed.periodStart || !parsed.periodEnd) {
      return buildSalesHistoryPreview({ fileName: fileName.trim(), fileBuffer })
    }
    const [existingRows, productResult, customerResult] = await Promise.all([
      listAllSalesHistoryForPeriod(parsed.periodStart, parsed.periodEnd),
      dataConnect.executeQuery('AdminListProducts', { limit: 2000, offset: 0 }),
      dataConnect.executeQuery('AdminListCustomers', { limit: 1100, offset: 0 })
    ])
    return buildSalesHistoryPreview({
      fileName: fileName.trim(), fileBuffer,
      existingRows,
      products: productResult.data?.products || [],
      customerCodes: (customerResult.data?.customers || []).map((customer) => customer.customerCode)
    })
  } catch (error) {
    console.error('Sales History preview failed', error)
    throw new HttpsError('internal', 'ไม่สามารถตรวจสอบไฟล์ Sales History ได้')
  }
})

export const confirmSalesHistoryImport = onCall({ cors: true, timeoutSeconds: 300, memory: '1GiB' }, async (request) => {
  assertSalesHistoryImportAdmin(request.auth)
  const { fileName, fileBase64, previewId } = request.data || {}
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv') || typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 3_000_000) {
    throw new HttpsError('invalid-argument', 'ข้อมูลไฟล์ Sales History ไม่ถูกต้องหรือไฟล์มีขนาดใหญ่เกิน 2 MB')
  }
  if (typeof previewId !== 'string' || previewId.length !== 64) throw new HttpsError('invalid-argument', 'ไม่พบรหัส Preview')
  try {
    const fileBuffer = Buffer.from(fileBase64, 'base64')
    const parsed = parseExpressSalesHistory(fileBuffer)
    const [existingRows, productResult, customerResult] = await Promise.all([
      listAllSalesHistoryForPeriod(parsed.periodStart, parsed.periodEnd),
      dataConnect.executeQuery('AdminListProducts', { limit: 2000, offset: 0 }),
      dataConnect.executeQuery('AdminListCustomers', { limit: 1100, offset: 0 })
    ])
    return await importSalesHistorySnapshot({ dataConnect, fileName: fileName.trim(), fileBuffer, previewId,
      importedByUid: request.auth.uid, existingRows,
      products: productResult.data?.products || [], customerCodes: (customerResult.data?.customers || []).map((item) => item.customerCode),
      findImportByHash: (sourceFileHash) => dataConnect.executeQuery('AdminGetSalesHistoryImportRunByHash', { sourceFileHash }) })
  } catch (error) {
    if (error instanceof HttpsError) throw error
    console.error('Sales History import failed', error)
    throw new HttpsError('internal', 'ไม่สามารถ Import Sales History ได้ กรุณาลอง Import ไฟล์เดิมอีกครั้ง')
  }
})

export const previewPurchaseHistoryImport = onCall({ cors: true, timeoutSeconds: 120 }, async (request) => {
  if (!request.auth || request.auth.token.firebase?.sign_in_provider === 'anonymous') throw new HttpsError('unauthenticated', 'กรุณาเข้าสู่ระบบก่อนตรวจสอบไฟล์')
  const { fileName, fileBase64 } = request.data || {}
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv') || typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 3_000_000) {
    throw new HttpsError('invalid-argument', 'ข้อมูลไฟล์ Purchase History ไม่ถูกต้องหรือไฟล์มีขนาดใหญ่เกิน 2 MB')
  }
  try {
    const fileBuffer = Buffer.from(fileBase64, 'base64')
    const parsed = parseExpressPurchaseHistory(fileBuffer)
    if (!parsed.periodStart || !parsed.periodEnd) return buildPurchaseHistoryPreview({ fileName: fileName.trim(), fileBuffer })
    const [existingResult, productResult, supplierResult] = await Promise.all([
      dataConnect.executeQuery('AdminListPurchaseHistoryForPeriod', { periodStart: parsed.periodStart, periodEnd: parsed.periodEnd, limit: 6000, offset: 0 }),
      dataConnect.executeQuery('AdminListProducts', { limit: 2000, offset: 0 }),
      adminListSuppliers({ limit: 2000, offset: 0 })
    ])
    return buildPurchaseHistoryPreview({ fileName: fileName.trim(), fileBuffer,
      existingRows: existingResult.data?.purchaseHistoryLines || [], products: productResult.data?.products || [],
      supplierCodes: (supplierResult.data?.suppliers || []).map((item) => item.supplierCode) })
  } catch (error) {
    console.error('Purchase History preview failed', error)
    throw new HttpsError('internal', 'ไม่สามารถตรวจสอบไฟล์ Purchase History ได้')
  }
})

export const confirmPurchaseHistoryImport = onCall({ cors: true, timeoutSeconds: 300, memory: '1GiB' }, async (request) => {
  assertPurchaseHistoryImportAdmin(request.auth)
  const { fileName, fileBase64, previewId } = request.data || {}
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv') || typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 3_000_000) throw new HttpsError('invalid-argument', 'ข้อมูลไฟล์ Purchase History ไม่ถูกต้องหรือไฟล์มีขนาดใหญ่เกิน 2 MB')
  if (typeof previewId !== 'string' || previewId.length !== 64) throw new HttpsError('invalid-argument', 'ไม่พบรหัส Preview')
  try {
    const fileBuffer = Buffer.from(fileBase64, 'base64')
    const parsed = parseExpressPurchaseHistory(fileBuffer)
    const [existingResult, productResult, supplierResult] = await Promise.all([
      dataConnect.executeQuery('AdminListPurchaseHistoryForPeriod', { periodStart: parsed.periodStart, periodEnd: parsed.periodEnd, limit: 6000, offset: 0 }),
      dataConnect.executeQuery('AdminListProducts', { limit: 2000, offset: 0 }),
      adminListSuppliers({ limit: 2000, offset: 0 })
    ])
    return await importPurchaseHistorySnapshot({ dataConnect, fileName: fileName.trim(), fileBuffer, previewId,
      importedByUid: request.auth.uid, existingRows: existingResult.data?.purchaseHistoryLines || [],
      products: productResult.data?.products || [], supplierCodes: (supplierResult.data?.suppliers || []).map((item) => item.supplierCode),
      findImportByHash: (sourceFileHash) => dataConnect.executeQuery('AdminGetPurchaseHistoryImportRunByHash', { sourceFileHash }) })
  } catch (error) {
    if (error instanceof HttpsError) throw error
    console.error('Purchase History import failed', error)
    throw new HttpsError('internal', 'ไม่สามารถ Import Purchase History ได้ ระบบไม่ได้เปลี่ยนแปลงข้อมูล')
  }
})

export const previewStockImport = onCall({ cors: true, timeoutSeconds: 120 }, async (request) => {
  if (!request.auth || request.auth.token.firebase?.sign_in_provider === 'anonymous') throw new HttpsError('unauthenticated', 'กรุณาเข้าสู่ระบบก่อนตรวจสอบไฟล์')
  const { fileName, fileBase64 } = request.data || {}
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv') || typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 3_000_000) {
    throw new HttpsError('invalid-argument', 'ข้อมูลไฟล์ Stock ไม่ถูกต้องหรือไฟล์มีขนาดใหญ่เกิน 2 MB')
  }
  try {
    const fileBuffer = Buffer.from(fileBase64, 'base64')
    const parsed = parseExpressStock(fileBuffer)
    if (!parsed.snapshotDate || !parsed.warehouseFrom || !parsed.warehouseTo) return buildStockPreview({ fileName: fileName.trim(), fileBuffer })
    const [existingResult, productResult] = await Promise.all([
      dataConnect.executeQuery('AdminListStockSnapshot', {
        snapshotDate: parsed.snapshotDate, warehouseFrom: parsed.warehouseFrom, warehouseTo: parsed.warehouseTo,
        limit: 5000, offset: 0
      }),
      dataConnect.executeQuery('AdminListProducts', { limit: 2000, offset: 0 })
    ])
    return buildStockPreview({
      fileName: fileName.trim(), fileBuffer,
      existingRows: existingResult.data?.stockSnapshots || [],
      existingLots: existingResult.data?.stockSnapshotLots || [],
      products: productResult.data?.products || []
    })
  } catch (error) {
    console.error('Stock preview failed', error)
    throw new HttpsError('internal', 'ไม่สามารถตรวจสอบไฟล์ Stock ได้')
  }
})

export const confirmStockImport = onCall({ cors: true, timeoutSeconds: 300, memory: '1GiB' }, async (request) => {
  assertStockImportAdmin(request.auth)
  const { fileName, fileBase64, previewId } = request.data || {}
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv') || typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 3_000_000) throw new HttpsError('invalid-argument', 'ข้อมูลไฟล์ Stock ไม่ถูกต้องหรือไฟล์มีขนาดใหญ่เกิน 2 MB')
  if (typeof previewId !== 'string' || previewId.length !== 64) throw new HttpsError('invalid-argument', 'ไม่พบรหัส Preview')
  try {
    const fileBuffer = Buffer.from(fileBase64, 'base64')
    const parsed = parseExpressStock(fileBuffer)
    const [existingResult, productResult] = await Promise.all([
      dataConnect.executeQuery('AdminListStockSnapshot', {
        snapshotDate: parsed.snapshotDate, warehouseFrom: parsed.warehouseFrom, warehouseTo: parsed.warehouseTo,
        limit: 5000, offset: 0
      }),
      dataConnect.executeQuery('AdminListProducts', { limit: 2000, offset: 0 })
    ])
    return await importStockSnapshot({
      dataConnect, fileName: fileName.trim(), fileBuffer, previewId, importedByUid: request.auth.uid,
      existingRows: existingResult.data?.stockSnapshots || [],
      existingLots: existingResult.data?.stockSnapshotLots || [],
      products: productResult.data?.products || [],
      findImportByHash: (sourceFileHash) => dataConnect.executeQuery('AdminGetStockImportRunByHash', { sourceFileHash })
    })
  } catch (error) {
    if (error instanceof HttpsError) throw error
    console.error('Stock import failed', error)
    throw new HttpsError('internal', 'ไม่สามารถ Import Stock ได้ ระบบไม่ได้เปลี่ยนแปลงข้อมูล')
  }
})

export const confirmProductImport = onCall({ cors: true, timeoutSeconds: 180 }, async (request) => {
  assertProductImportAdmin(request.auth)
  const { fileName, fileBase64, previewId } = request.data || {}
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv')) {
    throw new HttpsError('invalid-argument', 'กรุณาเลือกไฟล์ CSV Product จาก Express')
  }
  if (typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 3_000_000) {
    throw new HttpsError('invalid-argument', 'ข้อมูลไฟล์ไม่ถูกต้องหรือไฟล์มีขนาดใหญ่เกิน 2 MB')
  }
  if (typeof previewId !== 'string' || previewId.length !== 64) {
    throw new HttpsError('invalid-argument', 'ไม่พบรหัส Preview')
  }

  try {
    const [productResult, categoryResult, supplierResult] = await Promise.all([
      dataConnect.executeQuery('AdminListProducts', { limit: 2000, offset: 0 }),
      dataConnect.executeQuery('AdminListProductCategories', { limit: 100, offset: 0 }),
      adminListSuppliers({ limit: 2000, offset: 0 })
    ])
    return await importProductSnapshot({
      dataConnect,
      fileName: fileName.trim(),
      fileBuffer: Buffer.from(fileBase64, 'base64'),
      previewId,
      importedByUid: request.auth.uid,
      existingProducts: productResult.data?.products || [],
      existingCategories: categoryResult.data?.productCategories || [],
      supplierCodes: (supplierResult.data?.suppliers || []).map((supplier) => supplier.supplierCode),
      findImportByHash: (sourceFileHash) => dataConnect.executeQuery('AdminGetProductImportRunByHash', { sourceFileHash })
    })
  } catch (error) {
    if (error instanceof HttpsError) throw error
    console.error('Product import failed', error)
    throw new HttpsError('internal', 'ไม่สามารถ Import Product ได้ ระบบไม่ได้เปลี่ยนแปลงข้อมูล')
  }
})

export const confirmCustomerImport = onCall({ cors: true, timeoutSeconds: 120 }, async (request) => {
  assertCustomerImportAdmin(request.auth)
  const { fileName, fileBase64, previewId } = request.data || {}
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv')) {
    throw new HttpsError('invalid-argument', 'กรุณาเลือกไฟล์ CSV จาก Express')
  }
  if (typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 3_000_000) {
    throw new HttpsError('invalid-argument', 'ข้อมูลไฟล์ไม่ถูกต้องหรือไฟล์มีขนาดใหญ่เกิน 2 MB')
  }
  if (typeof previewId !== 'string' || previewId.length !== 64) {
    throw new HttpsError('invalid-argument', 'ไม่พบรหัส Preview')
  }

  try {
    const existingResult = await dataConnect.executeQuery('AdminListCustomers', { limit: 1100, offset: 0 })
    return await importCustomerSnapshot({
      dataConnect,
      fileName: fileName.trim(),
      fileBuffer: Buffer.from(fileBase64, 'base64'),
      previewId,
      importedByUid: request.auth.uid,
      existingCustomers: existingResult.data?.customers || [],
      findImportByHash: (sourceFileHash) => dataConnect.executeQuery('AdminGetCustomerImportRunByHash', { sourceFileHash })
    })
  } catch (error) {
    if (error instanceof HttpsError) throw error
    console.error('Customer import failed', error)
    throw new HttpsError('internal', 'ไม่สามารถ Import Customer ได้ ระบบไม่ได้เปลี่ยนแปลงข้อมูล')
  }
})

export const confirmSupplierImport = onCall({ cors: true, timeoutSeconds: 120 }, async (request) => {
  assertSupplierImportAdmin(request.auth)
  const { fileName, fileBase64, previewId } = request.data || {}
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv')) {
    throw new HttpsError('invalid-argument', 'กรุณาเลือกไฟล์ CSV จาก Express')
  }
  if (typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 3_000_000) {
    throw new HttpsError('invalid-argument', 'ข้อมูลไฟล์ไม่ถูกต้องหรือไฟล์มีขนาดใหญ่เกิน 2 MB')
  }
  if (typeof previewId !== 'string' || previewId.length !== 64) {
    throw new HttpsError('invalid-argument', 'ไม่พบรหัส Preview')
  }

  try {
    const existingResult = await adminListSuppliers({ limit: 2000, offset: 0 })
    return await importSupplierSnapshot({
      dataConnect,
      fileName: fileName.trim(),
      fileBuffer: Buffer.from(fileBase64, 'base64'),
      previewId,
      importedByUid: request.auth.uid,
      existingSuppliers: existingResult.data?.suppliers || []
    })
  } catch (error) {
    if (error instanceof HttpsError) throw error
    console.error('Supplier import failed', error)
    throw new HttpsError('internal', 'ไม่สามารถ Import Supplier ได้ ระบบไม่ได้เปลี่ยนแปลงข้อมูล')
  }
})
