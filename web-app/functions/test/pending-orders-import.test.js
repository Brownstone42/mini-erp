import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import test from 'node:test'
import { parseExpressProducts } from '../src/product-parser.js'
import { buildPendingOrdersPreview } from '../src/pending-orders-preview.js'
import { importPendingOrdersSnapshot } from '../src/pending-orders-import.js'

const pendingFile = new URL('../../../private-data/express-export/fixtures/express_pending_2026-09-18.csv', import.meta.url)
const productFile = new URL('../../../private-data/express-export/fixtures/express_products_2026-09-08.csv', import.meta.url)
const fixtureAvailable = fs.existsSync(pendingFile) && fs.existsSync(productFile)

test('previews pending orders with report scope and non-blocking unmatched product warning', { skip: !fixtureAvailable }, () => {
  const fileBuffer = fs.readFileSync(pendingFile)
  const products = parseExpressProducts(fs.readFileSync(productFile)).products
  const preview = buildPendingOrdersPreview({ fileName: 'pending.csv', fileBuffer, products })
  assert.equal(preview.isValid, true)
  assert.equal(preview.summary.totalRows, 13)
  assert.equal(preview.summary.productCount, 11)
  assert.equal(preview.summary.unitMismatchCount, 4)
  assert.equal(preview.summary.unmatchedProductCount, 1)
  assert.ok(preview.warnings.some((warning) => warning.field === 'period'))
  assert.deepEqual(preview.errors, [])
})

test('imports one immutable snapshot, its lines, and product subtotals in a transaction', { skip: !fixtureAvailable }, async () => {
  const fileBuffer = fs.readFileSync(pendingFile)
  const products = parseExpressProducts(fs.readFileSync(productFile)).products
  const calls = []
  const result = await importPendingOrdersSnapshot({
    fileName: 'pending.csv', fileBuffer, products,
    previewId: createHash('sha256').update(fileBuffer).digest('hex'),
    importedByUid: 'user-1',
    findImportByHash: async () => ({ data: { pendingOrderSnapshots: [] } }),
    dataConnect: { executeMutation: async (name, variables) => { calls.push({ name, variables }); return { data: {} } } }
  })
  assert.equal(result.alreadyImported, false)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, 'AdminImportPendingOrderSnapshot')
  assert.equal(calls[0].variables.snapshot.lineCount, 13)
  assert.equal(calls[0].variables.snapshot.periodEnd, '2026-08-31')
  assert.equal(calls[0].variables.lines.length, 13)
  assert.equal(calls[0].variables.products.length, 11)
  assert.equal(calls[0].variables.lines.find((row) => row.productCode === 'NTG-GN-926S-THPD').productCode, 'NTG-GN-926S-THPD')
})

test('does not insert the same file twice', { skip: !fixtureAvailable }, async () => {
  const fileBuffer = fs.readFileSync(pendingFile)
  const products = parseExpressProducts(fs.readFileSync(productFile)).products
  let writes = 0
  const result = await importPendingOrdersSnapshot({
    fileName: 'pending.csv', fileBuffer, products,
    previewId: createHash('sha256').update(fileBuffer).digest('hex'),
    importedByUid: 'user-1',
    findImportByHash: async () => ({ data: { pendingOrderSnapshots: [{ id: 'existing', importedAt: '2026-09-18T00:00:00Z' }] } }),
    dataConnect: { executeMutation: async () => { writes += 1 } }
  })
  assert.equal(result.alreadyImported, true)
  assert.equal(writes, 0)
})
