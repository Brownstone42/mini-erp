import assert from 'node:assert/strict'
import test from 'node:test'
import iconv from 'iconv-lite'
import { importCustomerSnapshot } from '../src/customer-import.js'

function customerFile() {
  return iconv.encode([
    ['', 'ประเภท:', 'ลูกค้าประจำ'],
    ['', '', '', 'AR001', 'Customer One', '', '', '', '', 'SALE01', 'กรุงเทพ', '1'],
    ['', '', '', '', '', '', '', '', 'เครดิต:', '30 วัน', '', 'วงเงิน:', '1000']
  ].map((row) => row.map((value) => `"${value}"`).join(',')).join('\r\n'), 'windows-874')
}

test('imports a Customer snapshot with one transactional mutation', async () => {
  const fileBuffer = customerFile()
  const { createHash } = await import('node:crypto')
  const previewId = createHash('sha256').update(fileBuffer).digest('hex')
  let mutationCall

  const result = await importCustomerSnapshot({
    dataConnect: {
      async executeMutation(name, variables) {
        mutationCall = { name, variables }
      }
    },
    fileName: 'customer.csv',
    fileBuffer,
    previewId,
    importedByUid: 'user-1',
    existingCustomers: [],
    findImportByHash: async () => ({ data: { customerImportRuns: [] } })
  })

  assert.equal(mutationCall.name, 'AdminImportCustomers')
  assert.equal(mutationCall.variables.customers.length, 1)
  assert.equal(mutationCall.variables.importRun.totalRows, 1)
  assert.equal(result.alreadyImported, false)
})

test('does not import the same Customer file twice', async () => {
  const fileBuffer = customerFile()
  const { createHash } = await import('node:crypto')
  const previewId = createHash('sha256').update(fileBuffer).digest('hex')
  let mutationExecuted = false

  const result = await importCustomerSnapshot({
    dataConnect: { executeMutation: async () => { mutationExecuted = true } },
    fileName: 'customer.csv',
    fileBuffer,
    previewId,
    importedByUid: 'user-1',
    existingCustomers: [],
    findImportByHash: async () => ({
      data: { customerImportRuns: [{ id: 'import-1', importedAt: '2026-08-10T09:00:00.000Z' }] }
    })
  })

  assert.equal(result.alreadyImported, true)
  assert.equal(mutationExecuted, false)
})
