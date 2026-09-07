import { createHash } from 'node:crypto'
import { parseExpressCustomers } from './customer-parser.js'

const COMPARED_FIELDS = [
  'customerName', 'customerType', 'salespersonCode', 'salesTerritory', 'priceType',
  'addressText', 'postalCode', 'contactName', 'expressAccountCode', 'shippingMethod',
  'creditDays', 'creditLimit', 'phoneText', 'paymentTerms', 'taxId', 'branchName',
  'email', 'noteText'
]

function comparable(value) {
  return value === undefined || value === '' ? null : value
}

export function buildCustomerPreview({ fileName, fileBuffer, existingCustomers = [] }) {
  const { customers, errors } = parseExpressCustomers(fileBuffer)
  const existingByCode = new Map(existingCustomers.map((customer) => [customer.customerCode, customer]))
  const incomingCodes = new Set(customers.map((customer) => customer.customerCode))
  const summary = {
    totalRows: customers.length,
    createCount: 0,
    updateCount: 0,
    reactivateCount: 0,
    unchangedCount: 0,
    deactivateCount: 0,
    errorCount: errors.length
  }

  const rows = customers.map((customer) => {
    const existing = existingByCode.get(customer.customerCode)
    let changeType = 'unchanged'
    if (!existing) {
      changeType = 'create'
      summary.createCount += 1
    } else if (existing.isActive === false) {
      changeType = 'reactivate'
      summary.reactivateCount += 1
    } else if (COMPARED_FIELDS.some((field) => comparable(customer[field]) !== comparable(existing[field]))) {
      changeType = 'update'
      summary.updateCount += 1
    } else {
      summary.unchangedCount += 1
    }
    return { ...customer, changeType }
  })

  const deactivate = existingCustomers
    .filter((customer) => customer.isActive && !incomingCodes.has(customer.customerCode))
    .map((customer) => ({ customerCode: customer.customerCode, customerName: customer.customerName }))
  summary.deactivateCount = deactivate.length

  return {
    previewId: createHash('sha256').update(fileBuffer).digest('hex'),
    fileName,
    isValid: errors.length === 0,
    summary,
    errors,
    rows,
    deactivate
  }
}
