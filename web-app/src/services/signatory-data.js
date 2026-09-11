import { executeMutation, executeQuery, getDataConnect, mutationRef, queryRef } from 'firebase/data-connect'
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import { firebaseApp } from './firebase.js'

const dataConnect = getDataConnect(firebaseApp, { connector: 'supplier-web', service: 'mini-erp-service', location: 'asia-southeast1' })
const storage = getStorage(firebaseApp)
const serverOnly = { fetchPolicy: 'SERVER_ONLY' }

async function imageUrl(path) {
  if (!path) return ''
  try { return await getDownloadURL(ref(storage, path)) }
  catch (error) { console.error(`Cannot read ${path}`, error); return '' }
}

export async function fetchSignatories() {
  const result = await executeQuery(queryRef(dataConnect, 'ListSignatories', { limit: 100, offset: 0 }), serverOnly)
  return Promise.all((result.data?.signatories || []).map(async (item) => ({
    ...item,
    signatureUrl: await imageUrl(item.signaturePath),
    stampUrl: await imageUrl(item.stampPath)
  })))
}

function extension(file) {
  return { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type] || 'bin'
}

async function uploadImage(id, kind, file) {
  if (!file) return null
  const path = `settings/signatories/${id}/${kind}.${extension(file)}`
  await uploadBytes(ref(storage, path), file, { contentType: file.type, cacheControl: 'private,max-age=3600' })
  return path
}

export async function createSignatory({ fullName, phoneText, email, signatureFile, stampFile }) {
  const id = crypto.randomUUID()
  const uploadedPaths = []
  try {
    const signaturePath = await uploadImage(id, 'signature', signatureFile)
    if (signaturePath) uploadedPaths.push(signaturePath)
    const stampPath = await uploadImage(id, 'stamp', stampFile)
    if (stampPath) uploadedPaths.push(stampPath)
    await executeMutation(mutationRef(dataConnect, 'CreateSignatory', {
      id,
      fullName: fullName.trim(),
      phoneText: phoneText.trim() || null,
      email: email.trim() || null,
      signaturePath,
      stampPath
    }))
    return id
  } catch (error) {
    await Promise.allSettled(uploadedPaths.map((path) => deleteObject(ref(storage, path))))
    throw error
  }
}

export async function setSignatoryActive(id, isActive) {
  return executeMutation(mutationRef(dataConnect, 'SetSignatoryActive', { id, isActive }))
}
