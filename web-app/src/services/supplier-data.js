import { getSupplier, listSuppliers } from '../dataconnect-generated/esm/index.esm.js'

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function mapSupplier(supplier) {
  if (!supplier) return null
  return {
    ...supplier,
    phone: supplier.phoneText,
    address: supplier.addressText,
    branch: supplier.branchName,
    status: supplier.isActive ? 'ACTIVE' : 'INACTIVE',
    updatedAtRaw: supplier.updatedAt,
    updatedAt: formatDateTime(supplier.updatedAt)
  }
}

export async function fetchSuppliers() {
  const result = await listSuppliers({ limit: 1000, offset: 0 })
  return (result.data?.suppliers || []).map(mapSupplier)
}

export async function fetchSupplier(supplierCode) {
  const result = await getSupplier({ supplierCode })
  return mapSupplier(result.data?.supplier)
}
