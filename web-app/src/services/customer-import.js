import { httpsCallable } from 'firebase/functions'
import { firebaseFunctions } from './firebase.js'

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'))
    reader.readAsDataURL(file)
  })
}

export async function previewCustomerFile(file) {
  const fileBase64 = await readFileAsBase64(file)
  const preview = httpsCallable(firebaseFunctions, 'previewCustomerImport')
  const result = await preview({ fileName: file.name, fileBase64 })
  return result.data
}

export async function confirmCustomerFile(file, previewId) {
  const fileBase64 = await readFileAsBase64(file)
  const confirmImport = httpsCallable(firebaseFunctions, 'confirmCustomerImport', { timeout: 120000 })
  const result = await confirmImport({ fileName: file.name, fileBase64, previewId })
  return result.data
}
