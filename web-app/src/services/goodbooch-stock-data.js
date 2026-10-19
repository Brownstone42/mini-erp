import { executeMutation, executeQuery, getDataConnect, mutationRef, queryRef } from 'firebase/data-connect'
import { firebaseApp } from './firebase.js'

const dataConnect = getDataConnect(firebaseApp, {
  connector: 'goodbooch-web',
  service: 'goodbooch-erp-service',
  location: 'asia-southeast1'
})

const serverOnly = { fetchPolicy: 'SERVER_ONLY' }

export const GOODBOOCH_STOCK_TRANSACTION_TYPES = Object.freeze({
  INITIAL_COUNT: 'INITIAL_COUNT',
  RECEIPT: 'RECEIPT'
})

export function goodboochStockTransactionLabel(value) {
  if (value === GOODBOOCH_STOCK_TRANSACTION_TYPES.INITIAL_COUNT) return 'ยอดตั้งต้นจากการตรวจนับ'
  if (value === GOODBOOCH_STOCK_TRANSACTION_TYPES.RECEIPT) return 'รับสินค้าเข้า'
  return value || '—'
}

export async function fetchGoodboochStockTransactions() {
  const transactions = []
  const limit = 1000
  let offset = 0
  while (true) {
    const result = await executeQuery(queryRef(dataConnect, 'ListGoodboochStockTransactions', { limit, offset }), serverOnly)
    const page = result.data?.goodboochStockTransactions || []
    transactions.push(...page)
    if (page.length < limit) break
    offset += limit
  }
  return transactions
}

export async function createGoodboochStockTransaction(input) {
  const quantity = Math.trunc(Number(input.quantityChange) || 0)
  const isInitialCount = input.transactionType === GOODBOOCH_STOCK_TRANSACTION_TYPES.INITIAL_COUNT
  if ((isInitialCount && quantity < 0) || (!isInitialCount && quantity <= 0)) throw new Error('INVALID_QUANTITY')
  return executeMutation(mutationRef(dataConnect, 'CreateGoodboochStockTransaction', {
    productSku: String(input.productSku || '').trim(),
    transactionType: input.transactionType,
    transactionDate: input.transactionDate,
    quantityChange: quantity,
    unitText: String(input.unitText || '').trim(),
    noteText: String(input.noteText || '').trim() || null
  }))
}
