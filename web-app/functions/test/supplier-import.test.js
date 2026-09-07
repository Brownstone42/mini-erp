import assert from 'node:assert/strict'
import test from 'node:test'
import iconv from 'iconv-lite'
import { importSupplierSnapshot } from '../src/supplier-import.js'

test('executes one transactional mutation with snapshot and audit variables', async () => {
  let mutationCall = null
  const dataConnect = {
    async executeMutation(name, variables) {
      mutationCall = { name, variables }
      return { data: {} }
    }
  }
  const csv = ['', '', '', 'AP001', 'Supplier One', '', '', '', '', '30', '', '0.00', '2111-00'].join(',')
  const fileBuffer = iconv.encode(csv, 'windows-874')
  const { createHash } = await import('node:crypto')
  const previewId = createHash('sha256').update(fileBuffer).digest('hex')

  const result = await importSupplierSnapshot({
    dataConnect,
    fileName: 'supplier.csv',
    fileBuffer,
    previewId,
    importedByUid: 'user-1',
    existingSuppliers: [],
    findImportByHash: async () => ({ data: { supplierImportRuns: [] } })
  })

  assert.equal(mutationCall.name, 'AdminImportSuppliers')
  assert.equal(mutationCall.variables.suppliers.length, 1)
  assert.equal(mutationCall.variables.importRun.totalRows, 1)
  assert.equal(mutationCall.variables.importRun.importedByUid, 'user-1')
  assert.equal(result.summary.createCount, 1)
  assert.equal(result.alreadyImported, false)
})

test('returns the previous result when the same file was already imported', async () => {
  const csv = ['', '', '', 'AP001', 'Supplier One'].join(',')
  const fileBuffer = iconv.encode(csv, 'windows-874')
  const { createHash } = await import('node:crypto')
  const previewId = createHash('sha256').update(fileBuffer).digest('hex')
  let mutationExecuted = false

  const result = await importSupplierSnapshot({
    dataConnect: { executeMutation: async () => { mutationExecuted = true } },
    fileName: 'supplier.csv',
    fileBuffer,
    previewId,
    importedByUid: 'user-1',
    existingSuppliers: [],
    findImportByHash: async () => ({
      data: { supplierImportRuns: [{ id: 'import-1', importedAt: '2026-08-07T08:37:00.000Z' }] }
    })
  })

  assert.equal(result.alreadyImported, true)
  assert.equal(result.importId, 'import-1')
  assert.equal(mutationExecuted, false)
})
