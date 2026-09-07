import { executeQuery, getDataConnect, queryRef } from 'firebase/data-connect'
import { firebaseApp } from './firebase.js'

const customerDataConnect = getDataConnect(firebaseApp, {
  connector: 'supplier-web',
  service: 'mini-erp-service',
  location: 'asia-southeast1'
})

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function mapCustomer(customer) {
  if (!customer) return null
  return {
    ...customer,
    phone: customer.phoneText,
    address: customer.addressText,
    branch: customer.branchName,
    status: customer.isActive ? 'ACTIVE' : 'INACTIVE',
    updatedAtRaw: customer.updatedAt,
    updatedAt: formatDateTime(customer.updatedAt),
    createdAt: formatDateTime(customer.createdAt)
  }
}

export async function fetchCustomers() {
  const result = await executeQuery(queryRef(customerDataConnect, 'ListCustomers', { limit: 1100, offset: 0 }))
  return (result.data?.customers || []).map(mapCustomer)
}

export async function fetchCustomer(customerCode) {
  const result = await executeQuery(queryRef(customerDataConnect, 'GetCustomer', { customerCode }))
  return mapCustomer(result.data?.customer)
}
