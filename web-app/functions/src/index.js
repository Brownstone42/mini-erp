import { initializeApp } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { createHash } from 'node:crypto'
import { getDataConnect } from 'firebase-admin/data-connect'
import { defineSecret } from 'firebase-functions/params'
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
import { buildPendingOrdersPreview } from './pending-orders-preview.js'
import { assertPendingOrdersImportAdmin, importPendingOrdersSnapshot } from './pending-orders-import.js'
import { isValidBackendImportKey } from './backend-import-auth.js'

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
const BACKEND_IMPORT_KEY = defineSecret('BACKEND_IMPORT_KEY')

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

const SIGNATORY_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const SIGNATORY_IMAGE_MAX_BYTES = 5 * 1024 * 1024

function assertSignatoryImagePath(signatoryId, kind, path, auth) {
  if (!path) return null
  const normalizedId = String(signatoryId || '').trim()
  const normalizedPath = String(path || '').trim()
  const legacyMatch = normalizedPath.match(new RegExp(`^settings/signatories/([0-9a-f-]+)/${kind}\\.(png|jpe?g|webp)$`, 'i'))
  const userMatch = normalizedPath.match(new RegExp(`^settings/signatories/users/([^/]+)/([0-9a-f-]+)/${kind}\\.(png|jpe?g|webp)$`, 'i'))
  const pathMatch = legacyMatch || userMatch
  const comparableId = normalizedId.replaceAll('-', '').toLowerCase()
  const comparablePathId = String(userMatch?.[2] || legacyMatch?.[1] || '').replaceAll('-', '').toLowerCase()
  if (!/^[0-9a-f]{32}$/.test(comparableId) || comparablePathId !== comparableId) {
    throw new HttpsError('invalid-argument', 'เส้นทางรูปกรรมการลงนามไม่ถูกต้อง')
  }
  const requesterEmail = String(auth?.token?.email || '').trim().toLowerCase()
  if (legacyMatch && requesterEmail !== 'anawatbooch@gmail.com') {
    throw new HttpsError('permission-denied', 'บัญชีนี้ไม่มีสิทธิ์ใช้รูปกรรมการลงนามรายการนี้')
  }
  if (userMatch && userMatch[1] !== auth?.uid) {
    throw new HttpsError('permission-denied', 'บัญชีนี้ไม่มีสิทธิ์ใช้รูปกรรมการลงนามรายการนี้')
  }
  return normalizedPath
}

async function storageImageDataUrl(path) {
  if (!path) return ''
  const file = getStorage().bucket().file(path)
  const [metadata] = await file.getMetadata()
  const extension = path.split('.').pop()?.toLowerCase()
  const inferredContentType = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }[extension]
  const contentType = String(metadata.contentType || inferredContentType || '').toLowerCase()
  const size = Number(metadata.size || 0)
  if (!SIGNATORY_IMAGE_TYPES.has(contentType) || size <= 0 || size > SIGNATORY_IMAGE_MAX_BYTES) {
    throw new HttpsError('failed-precondition', 'ไฟล์รูปกรรมการลงนามมีชนิดหรือขนาดไม่รองรับ')
  }
  const [buffer] = await file.download()
  return `data:${contentType};base64,${buffer.toString('base64')}`
}

export const loadSignatoryPdfImages = onCall({ cors: true, maxInstances: 5 }, async (request) => {
  if (!request.auth || request.auth.token.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('unauthenticated', 'กรุณาเข้าสู่ระบบก่อนโหลดรูปกรรมการลงนาม')
  }

  const { signatoryId, signaturePath, stampPath } = request.data || {}
  try {
    const safeSignaturePath = assertSignatoryImagePath(signatoryId, 'signature', signaturePath, request.auth)
    const safeStampPath = assertSignatoryImagePath(signatoryId, 'stamp', stampPath, request.auth)
    if (!safeSignaturePath) throw new HttpsError('failed-precondition', 'กรรมการคนนี้ยังไม่มีรูปลายเซ็น')
    const [signatureDataUrl, stampDataUrl] = await Promise.all([
      storageImageDataUrl(safeSignaturePath),
      storageImageDataUrl(safeStampPath)
    ])
    return { signatureDataUrl, stampDataUrl }
  } catch (error) {
    console.error('Cannot load signatory images for PDF', {
      signatoryId,
      signaturePath,
      stampPath,
      code: error?.code || null,
      message: error?.message || String(error),
      stack: error?.stack || null
    })
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', 'ไม่สามารถโหลดรูปลายเซ็นหรือตราประทับได้')
  }
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

function hasValidBackendImportKey(request) {
  const actual = request.get('x-mini-erp-import-key') || ''
  const expected = BACKEND_IMPORT_KEY.value()
  return isValidBackendImportKey(actual, expected)
}

export const backendImportPurchaseHistory = onRequest({
  cors: false,
  timeoutSeconds: 300,
  memory: '1GiB',
  maxInstances: 1,
  secrets: [BACKEND_IMPORT_KEY]
}, async (request, response) => {
  if (request.method !== 'POST') {
    response.set('Allow', 'POST').status(405).json({ ok: false, error: 'method-not-allowed' })
    return
  }
  if (!hasValidBackendImportKey(request)) {
    response.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }

  const { fileName, fileBase64, commit = false } = request.body || {}
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv') || typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 3_000_000) {
    response.status(400).json({ ok: false, error: 'invalid-file' })
    return
  }

  try {
    const normalizedFileName = fileName.trim()
    const fileBuffer = Buffer.from(fileBase64, 'base64')
    const parsed = parseExpressPurchaseHistory(fileBuffer)
    if (!parsed.periodStart || !parsed.periodEnd) {
      const preview = buildPurchaseHistoryPreview({ fileName: normalizedFileName, fileBuffer })
      response.status(422).json({ ok: false, imported: false, preview: compactPurchaseHistoryPreview(preview) })
      return
    }

    const [existingResult, productResult, supplierResult] = await Promise.all([
      dataConnect.executeQuery('AdminListPurchaseHistoryForPeriod', { periodStart: parsed.periodStart, periodEnd: parsed.periodEnd, limit: 6000, offset: 0 }),
      dataConnect.executeQuery('AdminListProducts', { limit: 2000, offset: 0 }),
      adminListSuppliers({ limit: 2000, offset: 0 })
    ])
    const previewOptions = {
      fileName: normalizedFileName,
      fileBuffer,
      existingRows: existingResult.data?.purchaseHistoryLines || [],
      products: productResult.data?.products || [],
      supplierCodes: (supplierResult.data?.suppliers || []).map((item) => item.supplierCode)
    }
    const preview = buildPurchaseHistoryPreview(previewOptions)
    const compactPreview = compactPurchaseHistoryPreview(preview)
    if (!preview.isValid) {
      response.status(422).json({ ok: false, imported: false, preview: compactPreview })
      return
    }
    if (commit !== true) {
      response.json({ ok: true, imported: false, preview: compactPreview })
      return
    }

    const result = await importPurchaseHistorySnapshot({
      dataConnect,
      ...previewOptions,
      previewId: preview.previewId,
      importedByUid: 'backend-automation',
      findImportByHash: (sourceFileHash) => dataConnect.executeQuery('AdminGetPurchaseHistoryImportRunByHash', { sourceFileHash })
    })
    response.json({ ok: true, imported: !result.alreadyImported, alreadyImported: result.alreadyImported, preview: compactPreview, result })
  } catch (error) {
    console.error('Backend Purchase History import failed', error)
    response.status(500).json({ ok: false, error: 'internal-error' })
  }
})

function compactPurchaseHistoryPreview(preview) {
  return {
    previewId: preview.previewId,
    fileName: preview.fileName,
    periodStart: preview.periodStart,
    periodEnd: preview.periodEnd,
    isValid: preview.isValid,
    summary: preview.summary,
    errors: preview.errors.slice(0, 100)
  }
}

const BACKEND_IMPORT_TYPES = new Set(['supplier', 'customer', 'product', 'sales', 'stock', 'pending'])

export const backendImportExpressData = onRequest({
  cors: false,
  timeoutSeconds: 300,
  memory: '1GiB',
  maxInstances: 1,
  secrets: [BACKEND_IMPORT_KEY]
}, async (request, response) => {
  if (request.method !== 'POST') {
    response.set('Allow', 'POST').status(405).json({ ok: false, error: 'method-not-allowed' })
    return
  }
  if (!hasValidBackendImportKey(request)) {
    response.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }

  const { dataType, fileName, fileBase64, commit = false } = request.body || {}
  if (!BACKEND_IMPORT_TYPES.has(dataType) || typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv') ||
      typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 3_000_000) {
    response.status(400).json({ ok: false, error: 'invalid-file-or-type' })
    return
  }

  try {
    const options = { fileName: fileName.trim(), fileBuffer: Buffer.from(fileBase64, 'base64') }
    const { preview, importOptions, importer } = await prepareBackendImport(dataType, options)
    if (!preview.isValid) {
      response.status(422).json({ ok: false, imported: false, preview: compactBackendPreview(preview) })
      return
    }
    if (commit !== true) {
      response.json({ ok: true, imported: false, preview: compactBackendPreview(preview) })
      return
    }

    const result = await importer({
      dataConnect,
      ...options,
      ...importOptions,
      previewId: preview.previewId,
      importedByUid: 'backend-automation'
    })
    response.json({
      ok: true,
      imported: !result.alreadyImported,
      alreadyImported: result.alreadyImported,
      preview: compactBackendPreview(preview),
      result
    })
  } catch (error) {
    console.error(`Backend ${request.body?.dataType || 'unknown'} import failed`, error)
    response.status(500).json({ ok: false, error: 'internal-error' })
  }
})

async function prepareBackendImport(dataType, options) {
  if (dataType === 'supplier') {
    const result = await adminListSuppliers({ limit: 2000, offset: 0 })
    const importOptions = {
      existingSuppliers: result.data?.suppliers || [],
      findImportByHash: ({ sourceFileHash }) => dataConnect.executeQuery('AdminGetImportRunByHash', { sourceFileHash })
    }
    return { preview: buildSupplierPreview({ ...options, ...importOptions }), importOptions, importer: importSupplierSnapshot }
  }
  if (dataType === 'customer') {
    const result = await dataConnect.executeQuery('AdminListCustomers', { limit: 1100, offset: 0 })
    const importOptions = {
      existingCustomers: result.data?.customers || [],
      findImportByHash: (sourceFileHash) => dataConnect.executeQuery('AdminGetCustomerImportRunByHash', { sourceFileHash })
    }
    return { preview: buildCustomerPreview({ ...options, ...importOptions }), importOptions, importer: importCustomerSnapshot }
  }
  if (dataType === 'product') {
    const [productResult, categoryResult, supplierResult] = await Promise.all([
      dataConnect.executeQuery('AdminListProducts', { limit: 2000, offset: 0 }),
      dataConnect.executeQuery('AdminListProductCategories', { limit: 100, offset: 0 }),
      adminListSuppliers({ limit: 2000, offset: 0 })
    ])
    const importOptions = {
      existingProducts: productResult.data?.products || [],
      existingCategories: categoryResult.data?.productCategories || [],
      supplierCodes: (supplierResult.data?.suppliers || []).map((item) => item.supplierCode),
      findImportByHash: (sourceFileHash) => dataConnect.executeQuery('AdminGetProductImportRunByHash', { sourceFileHash })
    }
    return { preview: buildProductPreview({ ...options, ...importOptions }), importOptions, importer: importProductSnapshot }
  }
  if (dataType === 'sales') {
    const parsed = parseExpressSalesHistory(options.fileBuffer)
    const [existingRows, productResult, customerResult] = await Promise.all([
      listAllSalesHistoryForPeriod(parsed.periodStart, parsed.periodEnd),
      dataConnect.executeQuery('AdminListProducts', { limit: 2000, offset: 0 }),
      dataConnect.executeQuery('AdminListCustomers', { limit: 1100, offset: 0 })
    ])
    const importOptions = {
      existingRows,
      products: productResult.data?.products || [],
      customerCodes: (customerResult.data?.customers || []).map((item) => item.customerCode),
      findImportByHash: (sourceFileHash) => dataConnect.executeQuery('AdminGetSalesHistoryImportRunByHash', { sourceFileHash })
    }
    return { preview: buildSalesHistoryPreview({ ...options, ...importOptions }), importOptions, importer: importSalesHistorySnapshot }
  }
  if (dataType === 'stock') {
    const parsed = parseExpressStock(options.fileBuffer)
    const [existingResult, productResult] = await Promise.all([
      dataConnect.executeQuery('AdminListStockSnapshot', {
        snapshotDate: parsed.snapshotDate,
        warehouseFrom: parsed.warehouseFrom,
        warehouseTo: parsed.warehouseTo,
        limit: 5000,
        offset: 0
      }),
      dataConnect.executeQuery('AdminListProducts', { limit: 2000, offset: 0 })
    ])
    const importOptions = {
      existingRows: existingResult.data?.stockSnapshots || [],
      existingLots: existingResult.data?.stockSnapshotLots || [],
      products: productResult.data?.products || [],
      findImportByHash: (sourceFileHash) => dataConnect.executeQuery('AdminGetStockImportRunByHash', { sourceFileHash })
    }
    return { preview: buildStockPreview({ ...options, ...importOptions }), importOptions, importer: importStockSnapshot }
  }

  const sourceFileHash = createHash('sha256').update(options.fileBuffer).digest('hex')
  const [productResult, duplicateResult] = await Promise.all([
    dataConnect.executeQuery('AdminListProducts', { limit: 2000, offset: 0 }),
    dataConnect.executeQuery('AdminGetPendingOrderSnapshotByHash', { sourceFileHash })
  ])
  const importOptions = {
    products: productResult.data?.products || [],
    existingSnapshot: duplicateResult.data?.pendingOrderSnapshots?.[0],
    findImportByHash: (hash) => dataConnect.executeQuery('AdminGetPendingOrderSnapshotByHash', { sourceFileHash: hash })
  }
  return { preview: buildPendingOrdersPreview({ ...options, ...importOptions }), importOptions, importer: importPendingOrdersSnapshot }
}

function compactBackendPreview(preview) {
  return {
    previewId: preview.previewId,
    fileName: preview.fileName,
    periodStart: preview.periodStart,
    periodEnd: preview.periodEnd,
    snapshotDate: preview.snapshotDate,
    reportDate: preview.reportDate,
    isValid: preview.isValid,
    summary: preview.summary,
    errors: (preview.errors || []).slice(0, 100),
    warnings: (preview.warnings || []).slice(0, 100)
  }
}

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

export const previewPendingOrdersImport = onCall({ cors: true, timeoutSeconds: 120 }, async (request) => {
  if (!request.auth || request.auth.token.firebase?.sign_in_provider === 'anonymous') throw new HttpsError('unauthenticated', 'กรุณาเข้าสู่ระบบก่อนตรวจสอบไฟล์')
  const { fileName, fileBase64 } = request.data || {}
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv') || typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 3_000_000) {
    throw new HttpsError('invalid-argument', 'ข้อมูลไฟล์ Pending Orders ไม่ถูกต้องหรือไฟล์มีขนาดใหญ่เกิน 2 MB')
  }
  try {
    const fileBuffer = Buffer.from(fileBase64, 'base64')
    const sourceFileHash = createHash('sha256').update(fileBuffer).digest('hex')
    const [productResult, duplicateResult] = await Promise.all([
      dataConnect.executeQuery('AdminListProducts', { limit: 2000, offset: 0 }),
      dataConnect.executeQuery('AdminGetPendingOrderSnapshotByHash', { sourceFileHash })
    ])
    return buildPendingOrdersPreview({ fileName: fileName.trim(), fileBuffer,
      products: productResult.data?.products || [], existingSnapshot: duplicateResult.data?.pendingOrderSnapshots?.[0] })
  } catch (error) {
    if (error instanceof HttpsError) throw error
    console.error('Pending Orders preview failed', error)
    throw new HttpsError('internal', 'ไม่สามารถตรวจสอบไฟล์ Pending Orders ได้')
  }
})

export const confirmPendingOrdersImport = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  assertPendingOrdersImportAdmin(request.auth)
  const { fileName, fileBase64, previewId } = request.data || {}
  if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.csv') || typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 3_000_000) {
    throw new HttpsError('invalid-argument', 'ข้อมูลไฟล์ Pending Orders ไม่ถูกต้องหรือไฟล์มีขนาดใหญ่เกิน 2 MB')
  }
  if (typeof previewId !== 'string' || previewId.length !== 64) throw new HttpsError('invalid-argument', 'ไม่พบรหัส Preview')
  try {
    const fileBuffer = Buffer.from(fileBase64, 'base64')
    const productResult = await dataConnect.executeQuery('AdminListProducts', { limit: 2000, offset: 0 })
    return await importPendingOrdersSnapshot({ dataConnect, fileName: fileName.trim(), fileBuffer, previewId,
      importedByUid: request.auth.uid, products: productResult.data?.products || [],
      findImportByHash: (sourceFileHash) => dataConnect.executeQuery('AdminGetPendingOrderSnapshotByHash', { sourceFileHash }) })
  } catch (error) {
    if (error instanceof HttpsError) throw error
    console.error('Pending Orders import failed', error)
    throw new HttpsError('internal', 'ไม่สามารถ Import Pending Orders ได้ ระบบไม่ได้เปลี่ยนแปลงข้อมูล')
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

export const backendImportUnitConversions = onRequest({
  cors: false,
  timeoutSeconds: 120,
  maxInstances: 1,
  secrets: [BACKEND_IMPORT_KEY]
}, async (request, response) => {
  if (request.method !== 'POST') {
    response.set('Allow', 'POST').status(405).json({ ok: false, error: 'method-not-allowed' })
    return
  }
  if (!hasValidBackendImportKey(request)) {
    response.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }

  const productConversions = Array.isArray(request.body?.productConversions) ? request.body.productConversions : []
  const universalConversions = Array.isArray(request.body?.universalConversions) ? request.body.universalConversions : []
  const validProductRows = productConversions.every((item) =>
    typeof item.productCode === 'string' && item.productCode.trim() &&
    typeof item.sourceUnitKey === 'string' && item.sourceUnitKey.trim() &&
    typeof item.sourceUnitText === 'string' && item.sourceUnitText.trim() &&
    typeof item.baseUnitText === 'string' && item.baseUnitText.trim() &&
    Number.isFinite(Number(item.baseQuantityPerSourceUnit)) && Number(item.baseQuantityPerSourceUnit) > 0
  )
  const validUniversalRows = universalConversions.every((item) =>
    typeof item.sourceUnitKey === 'string' && item.sourceUnitKey.trim() &&
    typeof item.sourceUnitText === 'string' && item.sourceUnitText.trim() &&
    typeof item.baseUnitText === 'string' && item.baseUnitText.trim() &&
    Number.isFinite(Number(item.baseQuantityPerSourceUnit)) && Number(item.baseQuantityPerSourceUnit) > 0
  )
  if (!productConversions.length || productConversions.length > 2000 || universalConversions.length > 100 || !validProductRows || !validUniversalRows) {
    response.status(400).json({ ok: false, error: 'invalid-conversions' })
    return
  }

  try {
    const now = new Date().toISOString()
    const normalize = (item) => ({
      ...item,
      createdByUid: 'backend-automation',
      updatedAt: now
    })
    await dataConnect.executeMutation('AdminImportProductUnitConversions', {
      productConversions: productConversions.map(normalize),
      universalConversions: universalConversions.map(normalize)
    })
    const stored = await dataConnect.executeQuery('AdminListProductUnitConversions', { limit: 2000, offset: 0 })
    response.json({
      ok: true,
      productConversionCount: stored.data?.productUnitConversions?.length || 0,
      universalConversionCount: stored.data?.universalUnitConversions?.length || 0
    })
  } catch (error) {
    console.error('Backend Unit Conversion import failed', error)
    response.status(500).json({ ok: false, error: 'internal-error' })
  }
})
