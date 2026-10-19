import { executeMutation, executeQuery, getDataConnect, mutationRef, queryRef } from 'firebase/data-connect'
import { firebaseApp } from './firebase.js'

const dataConnect = getDataConnect(firebaseApp, { connector: 'supplier-web', service: 'mini-erp-service', location: 'asia-southeast1' })
const serverOnly = { fetchPolicy: 'SERVER_ONLY' }

export function unitKey(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('th-TH')
}

export async function fetchUnitMappings() {
  const result = await executeQuery(queryRef(dataConnect, 'ListUnitMappings', { limit: 1000, offset: 0 }), serverOnly)
  return result.data?.unitMappings || []
}

export async function saveUnitMapping({ sourceUnitText, standardUnitText, noteText }) {
  const source = String(sourceUnitText || '').trim().replace(/\s+/g, ' ')
  const standard = String(standardUnitText || '').trim().replace(/\s+/g, ' ')
  return executeMutation(mutationRef(dataConnect, 'SaveUnitMapping', {
    sourceUnitKey: unitKey(source),
    sourceUnitText: source,
    standardUnitText: standard,
    noteText: String(noteText || '').trim() || null
  }))
}

export async function deleteUnitMapping(sourceUnitKey) {
  return executeMutation(mutationRef(dataConnect, 'DeleteUnitMapping', { sourceUnitKey }))
}

