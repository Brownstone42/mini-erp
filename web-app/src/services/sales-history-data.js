import { executeQuery, getDataConnect, queryRef } from 'firebase/data-connect'
import { firebaseApp } from './firebase.js'

const dataConnect = getDataConnect(firebaseApp, { connector: 'supplier-web', service: 'mini-erp-service', location: 'asia-southeast1' })

export async function fetchSalesHistory() {
  const pageSize = 6000
  const rows = []
  let offset = 0
  while (true) {
    const result = await executeQuery(queryRef(dataConnect, 'ListSalesHistory', { limit: pageSize, offset }))
    const page = result.data?.salesHistoryLines || []
    rows.push(...page)
    if (page.length < pageSize) break
    offset += pageSize
  }
  return rows.map((row) => ({ ...row,
    productCode: row.product?.productCode, productName: row.product?.productName,
    customerCode: row.customer?.customerCode, customerName: row.customer?.customerName }))
}
