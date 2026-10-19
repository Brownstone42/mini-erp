import { executeMutation, executeQuery, getDataConnect, mutationRef, queryRef } from 'firebase/data-connect'
import { firebaseApp } from './firebase.js'

const dataConnect = getDataConnect(firebaseApp, {
  connector: 'goodbooch-web',
  service: 'goodbooch-erp-service',
  location: 'asia-southeast1'
})

const serverOnly = { fetchPolicy: 'SERVER_ONLY' }

export const GOODBOOCH_INVENTORY_METHODS = Object.freeze([
  { value: 'DIRECT', label: 'ตัดสต็อกตามจำนวนขาย' },
  { value: 'VARIABLE_REPACK', label: 'Repack จำนวนไม่แน่นอน (ติดตามเฉพาะห่อใหญ่)' }
])

export function inventoryMethodLabel(value) {
  return GOODBOOCH_INVENTORY_METHODS.find((item) => item.value === value)?.label || value || '—'
}

function cleanNullable(value) {
  return String(value || '').trim() || null
}

function cleanProduct(input) {
  return {
    sku: String(input.sku || '').trim(),
    productName: String(input.productName || '').trim(),
    inventoryMethod: input.inventoryMethod,
    baseUnit: String(input.baseUnit || '').trim(),
    lowStockThreshold: Math.max(0, Math.trunc(Number(input.lowStockThreshold) || 0)),
    idealGlobeProductCode: cleanNullable(input.idealGlobeProductCode),
    noteText: cleanNullable(input.noteText)
  }
}

export async function fetchGoodboochProducts() {
  const products = []
  const limit = 1000
  let offset = 0
  while (true) {
    const result = await executeQuery(queryRef(dataConnect, 'ListGoodboochProducts', { limit, offset }), serverOnly)
    const page = result.data?.goodboochProducts || []
    products.push(...page)
    if (page.length < limit) break
    offset += limit
  }
  return products
}

export async function fetchGoodboochProduct(sku) {
  const result = await executeQuery(queryRef(dataConnect, 'GetGoodboochProduct', { sku }), serverOnly)
  return result.data?.goodboochProduct || null
}

export async function createGoodboochProduct(input) {
  return executeMutation(mutationRef(dataConnect, 'CreateGoodboochProduct', cleanProduct(input)))
}

export async function updateGoodboochProduct(input) {
  return executeMutation(mutationRef(dataConnect, 'UpdateGoodboochProduct', {
    ...cleanProduct(input),
    isActive: Boolean(input.isActive)
  }))
}

export async function renameGoodboochProduct(oldSku, input) {
  return executeMutation(mutationRef(dataConnect, 'RenameGoodboochProduct', {
    oldSku,
    newSku: cleanProduct(input).sku,
    productName: cleanProduct(input).productName,
    inventoryMethod: cleanProduct(input).inventoryMethod,
    baseUnit: cleanProduct(input).baseUnit,
    lowStockThreshold: cleanProduct(input).lowStockThreshold,
    idealGlobeProductCode: cleanProduct(input).idealGlobeProductCode,
    noteText: cleanProduct(input).noteText,
    isActive: Boolean(input.isActive)
  }))
}
