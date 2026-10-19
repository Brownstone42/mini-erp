import { executeMutation, executeQuery, getDataConnect, mutationRef, queryRef } from 'firebase/data-connect'
import { firebaseApp } from './firebase.js'

const dataConnect = getDataConnect(firebaseApp, {
  connector: 'goodbooch-web',
  service: 'goodbooch-erp-service',
  location: 'asia-southeast1'
})

const serverOnly = { fetchPolicy: 'SERVER_ONLY' }

export const GOODBOOCH_SHOPS = Object.freeze([
  { value: 'GOODBOOCH', label: 'Goodbooch' },
  { value: 'CLEANSHIELD', label: 'Cleanshield' }
])

export const GOODBOOCH_STOCK_EFFECTS = Object.freeze([
  { value: 'DEDUCT_EXACT', label: 'ตัดสต็อกตามจำนวนที่กำหนด' },
  { value: 'NO_AUTO_DEDUCTION', label: 'Repack — ไม่ตัดสต็อกอัตโนมัติ' }
])

export function goodboochShopLabel(value) {
  return GOODBOOCH_SHOPS.find((item) => item.value === value)?.label || value || '—'
}

export function goodboochStockEffectLabel(value) {
  return GOODBOOCH_STOCK_EFFECTS.find((item) => item.value === value)?.label || value || '—'
}

function cleanNullable(value) {
  return String(value || '').trim() || null
}

function cleanMapping(input) {
  const isExact = input.stockEffect === 'DEDUCT_EXACT'
  return {
    shopCode: input.shopCode,
    shopeeSku: String(input.shopeeSku || '').trim(),
    listingName: cleanNullable(input.listingName),
    variantName: cleanNullable(input.variantName),
    productSku: String(input.productSku || '').trim(),
    stockEffect: input.stockEffect,
    quantityPerOrder: isExact ? Math.max(1, Math.trunc(Number(input.quantityPerOrder) || 1)) : 0
  }
}

export async function fetchGoodboochSalesSkuMappings() {
  const mappings = []
  const limit = 1000
  let offset = 0
  while (true) {
    const result = await executeQuery(queryRef(dataConnect, 'ListGoodboochSalesSkuMappings', { limit, offset }), serverOnly)
    const page = result.data?.goodboochSalesSkuMappings || []
    mappings.push(...page)
    if (page.length < limit) break
    offset += limit
  }
  return mappings
}

export function createGoodboochSalesSkuMapping(input) {
  return executeMutation(mutationRef(dataConnect, 'CreateGoodboochSalesSkuMapping', cleanMapping(input)))
}

export function updateGoodboochSalesSkuMapping(input) {
  return executeMutation(mutationRef(dataConnect, 'UpdateGoodboochSalesSkuMapping', {
    id: input.id,
    ...cleanMapping(input),
    isActive: Boolean(input.isActive)
  }))
}
