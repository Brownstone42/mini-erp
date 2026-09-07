import { executeQuery, getDataConnect, queryRef } from 'firebase/data-connect'
import { httpsCallable } from 'firebase/functions'
import { firebaseApp, firebaseFunctions } from './firebase.js'

const dataConnect = getDataConnect(firebaseApp, { connector: 'supplier-web', service: 'mini-erp-service', location: 'asia-southeast1' })
const serverOnly = { fetchPolicy: 'SERVER_ONLY' }

function base64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'))
    reader.readAsDataURL(file)
  })
}

export async function previewStockFile(file) {
  const result = await httpsCallable(firebaseFunctions, 'previewStockImport', { timeout: 120000 })({ fileName: file.name, fileBase64: await base64(file) })
  return result.data
}

export async function confirmStockFile(file, previewId) {
  const result = await httpsCallable(firebaseFunctions, 'confirmStockImport', { timeout: 300000 })({ fileName: file.name, fileBase64: await base64(file), previewId })
  return result.data
}

export async function fetchStockSnapshots() {
  const result = await executeQuery(queryRef(dataConnect, 'ListStockSnapshots', { limit: 5000, offset: 0 }), serverOnly)
  return {
    rows: (result.data?.stockSnapshots || []).map((row) => ({
      ...row,
      productCode: row.product?.productCode,
      productName: row.product?.productName
    })),
    lots: result.data?.stockSnapshotLots || []
  }
}
