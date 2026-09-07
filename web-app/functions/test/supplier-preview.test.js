import assert from 'node:assert/strict'
import test from 'node:test'
import iconv from 'iconv-lite'
import { buildSupplierPreview } from '../src/supplier-preview.js'

test('classifies all preview change types', () => {
  const csv = [
    ['', '', '', 'AP001', 'Same', '', '', '', '', '0', '', '0.00', ''],
    ['', '', '', 'AP002', 'Changed', '', '', '', '', '30', '', '0.00', ''],
    ['', '', '', 'AP003', 'Back', '', '', '', '', '0', '', '0.00', ''],
    ['', '', '', 'AP004', 'New', '', '', '', '', '0', '', '0.00', '']
  ].map((row) => row.join(',')).join('\r\n')
  const preview = buildSupplierPreview({
    fileName: 'supplier.csv',
    fileBuffer: iconv.encode(csv, 'windows-874'),
    existingSuppliers: [
      { supplierCode: 'AP001', supplierName: 'Same', creditDays: 0, creditLimit: 0, isActive: true },
      { supplierCode: 'AP002', supplierName: 'Old', creditDays: 30, creditLimit: 0, isActive: true },
      { supplierCode: 'AP003', supplierName: 'Back', creditDays: 0, creditLimit: 0, isActive: false },
      { supplierCode: 'AP999', supplierName: 'Missing', isActive: true }
    ]
  })
  assert.deepEqual(preview.summary, {
    totalRows: 4,
    createCount: 1,
    updateCount: 1,
    reactivateCount: 1,
    unchangedCount: 1,
    deactivateCount: 1,
    errorCount: 0
  })
})
