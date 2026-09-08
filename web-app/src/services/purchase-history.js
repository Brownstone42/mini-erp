import { executeQuery, getDataConnect, queryRef } from 'firebase/data-connect'
import { httpsCallable } from 'firebase/functions'
import { firebaseApp, firebaseFunctions } from './firebase.js'

const dataConnect = getDataConnect(firebaseApp, { connector: 'supplier-web', service: 'mini-erp-service', location: 'asia-southeast1' })
function base64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้')); reader.readAsDataURL(file) }) }
export async function previewPurchaseHistoryFile(file) { const result = await httpsCallable(firebaseFunctions, 'previewPurchaseHistoryImport', { timeout: 120000 })({ fileName: file.name, fileBase64: await base64(file) }); return result.data }
export async function confirmPurchaseHistoryFile(file, previewId) { const result = await httpsCallable(firebaseFunctions, 'confirmPurchaseHistoryImport', { timeout: 300000 })({ fileName: file.name, fileBase64: await base64(file), previewId }); return result.data }
export async function fetchPurchaseHistory() {
  const pageSize = 6000
  const rows = []
  for (let offset = 0; ; offset += pageSize) {
    const result = await executeQuery(queryRef(dataConnect, 'ListPurchaseHistory', { limit: pageSize, offset }))
    const page = result.data?.purchaseHistoryLines || []
    rows.push(...page)
    if (page.length < pageSize) break
  }
  return rows.map((row) => ({ ...row, productCode: row.product?.productCode, productName: row.product?.productName, supplierCode: row.supplier?.supplierCode, supplierName: row.supplier?.supplierName }))
}
