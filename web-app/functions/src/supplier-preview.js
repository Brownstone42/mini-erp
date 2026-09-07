import { createHash } from 'node:crypto'
import { parseExpressSuppliers } from './supplier-parser.js'

const COMPARED_FIELDS = [
  'supplierName', 'supplierType', 'creditDays', 'creditLimit',
  'expressAccountCode', 'addressText', 'phoneText', 'contactName',
  'taxId', 'email', 'branchName'
]

function comparable(value) {
  return value === undefined || value === '' ? null : value
}

function hasChanges(incoming, existing) {
  return COMPARED_FIELDS.some((field) => comparable(incoming[field]) !== comparable(existing[field]))
}

export function buildSupplierPreview({ fileName, fileBuffer, existingSuppliers = [] }) {
  const { suppliers, errors } = parseExpressSuppliers(fileBuffer)
  const existingByCode = new Map(existingSuppliers.map((supplier) => [supplier.supplierCode, supplier]))
  const incomingCodes = new Set(suppliers.map((supplier) => supplier.supplierCode))
  const summary = {
    totalRows: suppliers.length,
    createCount: 0,
    updateCount: 0,
    reactivateCount: 0,
    unchangedCount: 0,
    deactivateCount: 0,
    errorCount: errors.length
  }

  const rows = suppliers.map((supplier) => {
    const existing = existingByCode.get(supplier.supplierCode)
    let changeType = 'unchanged'
    if (!existing) {
      changeType = 'create'
      summary.createCount += 1
    } else if (existing.isActive === false) {
      changeType = 'reactivate'
      summary.reactivateCount += 1
    } else if (hasChanges(supplier, existing)) {
      changeType = 'update'
      summary.updateCount += 1
    } else {
      summary.unchangedCount += 1
    }
    return { ...supplier, changeType }
  })

  const deactivate = existingSuppliers
    .filter((supplier) => supplier.isActive && !incomingCodes.has(supplier.supplierCode))
    .map((supplier) => ({ supplierCode: supplier.supplierCode, supplierName: supplier.supplierName }))
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
