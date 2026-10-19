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

export async function previewPendingOrdersFile(file) {
  const result = await httpsCallable(firebaseFunctions, 'previewPendingOrdersImport', { timeout: 120000 })({ fileName: file.name, fileBase64: await base64(file) })
  return result.data
}

export async function confirmPendingOrdersFile(file, previewId) {
  const result = await httpsCallable(firebaseFunctions, 'confirmPendingOrdersImport', { timeout: 300000 })({ fileName: file.name, fileBase64: await base64(file), previewId })
  return result.data
}

export async function fetchPendingOrderSnapshots() {
  const result = await executeQuery(queryRef(dataConnect, 'ListPendingOrderSnapshots', { limit: 100 }), serverOnly)
  return result.data?.pendingOrderSnapshots || []
}

export async function fetchPendingOrderSnapshotDetails(snapshotId) {
  const result = await executeQuery(queryRef(dataConnect, 'ListPendingOrderSnapshotDetails', { snapshotId, limit: 5000 }), serverOnly)
  return { rows: result.data?.pendingOrderLines || [], products: result.data?.pendingOrderProductSummaries || [] }
}
