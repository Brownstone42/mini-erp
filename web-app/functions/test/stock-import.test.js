import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { parseExpressProducts } from '../src/product-parser.js'
import { importStockSnapshot } from '../src/stock-import.js'

const stockFile = new URL('../../../private-data/express-export/raw/express_stock_2026-09-07.csv', import.meta.url)
const productFile = new URL('../../../private-data/express-export/raw/express_products_2026-08-31.csv', import.meta.url)

test('imports Stock products and Lots in one transactional mutation', async () => {
  const fileBuffer = fs.readFileSync(stockFile)
  const products = parseExpressProducts(fs.readFileSync(productFile)).products
  const calls = []
  const result = await importStockSnapshot({
    fileName: 'stock.csv', fileBuffer,
    previewId: (await import('node:crypto')).createHash('sha256').update(fileBuffer).digest('hex'),
    importedByUid: 'user-1', products,
    findImportByHash: async () => ({ data: { stockImportRuns: [] } }),
    dataConnect: { executeMutation: async (name, variables) => { calls.push({ name, variables }); return { data: {} } } }
  })
  assert.equal(result.alreadyImported, false)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, 'AdminImportStockSnapshot')
  assert.equal(calls[0].variables.rows.length, 418)
  assert.equal(calls[0].variables.lots.length, 1307)
})
