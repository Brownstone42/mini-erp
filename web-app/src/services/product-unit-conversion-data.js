import { executeQuery, getDataConnect, queryRef } from 'firebase/data-connect'
import { firebaseApp } from './firebase.js'

const dataConnect = getDataConnect(firebaseApp, { connector: 'supplier-web', service: 'mini-erp-service', location: 'asia-southeast1' })
const serverOnly = { fetchPolicy: 'SERVER_ONLY' }

export async function fetchProductUnitConversions() {
  const result = await executeQuery(queryRef(dataConnect, 'ListProductUnitConversions', { limit: 2000, offset: 0 }), serverOnly)
  return {
    productConversions: result.data?.productUnitConversions || [],
    universalConversions: result.data?.universalUnitConversions || []
  }
}
