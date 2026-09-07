import { executeMutation, executeQuery, getDataConnect, mutationRef, queryRef } from 'firebase/data-connect'
import { firebaseApp } from './firebase.js'

const dataConnect = getDataConnect(firebaseApp, { connector: 'supplier-web', service: 'mini-erp-service', location: 'asia-southeast1' })
const serverOnly = { fetchPolicy: 'SERVER_ONLY' }

export async function fetchProductGroups() {
  const result = await executeQuery(queryRef(dataConnect, 'ListProductGroups', { limit: 500, offset: 0 }), serverOnly)
  const counts = new Map()
  ;(result.data?.productGroupItems || []).forEach((item) => counts.set(item.groupId, (counts.get(item.groupId) || 0) + 1))
  return (result.data?.productGroups || []).map((group) => ({ ...group, productCount: counts.get(group.id) || 0 }))
}

export async function fetchProductGroup(id) {
  const result = await executeQuery(queryRef(dataConnect, 'GetProductGroup', { id, limit: 5000 }), serverOnly)
  const group = result.data?.productGroup
  if (!group) return null
  return { ...group, items: (result.data?.productGroupItems || []).map((item) => ({ ...item, productName: item.product?.productName, isActive: item.product?.isActive })) }
}

export async function createProductGroup(groupName) {
  return executeMutation(mutationRef(dataConnect, 'CreateProductGroup', { groupName: groupName.trim() }))
}

export async function renameProductGroup(id, groupName) {
  return executeMutation(mutationRef(dataConnect, 'RenameProductGroup', { id, groupName: groupName.trim() }))
}

export async function removeProductFromGroup(groupId, productCode) {
  return executeMutation(mutationRef(dataConnect, 'RemoveProductFromGroup', { groupId, productCode }))
}

export async function addProductToGroup(groupId, productCode) {
  return executeMutation(mutationRef(dataConnect, 'AddProductToGroup', { groupId, productCode }))
}
