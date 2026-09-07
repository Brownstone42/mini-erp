import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { parseExpressProducts } from '../src/product-parser.js'
import { buildStockPreview } from '../src/stock-preview.js'

const stockFile = new URL('../../../private-data/express-export/raw/express_stock_2026-09-07.csv', import.meta.url)
const productFile = new URL('../../../private-data/express-export/raw/express_products_2026-08-31.csv', import.meta.url)

test('builds a valid Stock preview against Product Master Data', () => {
  const products = parseExpressProducts(fs.readFileSync(productFile)).products
  const preview = buildStockPreview({ fileName: 'stock.csv', fileBuffer: fs.readFileSync(stockFile), products })
  assert.equal(preview.isValid, true)
  assert.equal(preview.summary.totalRows, 418)
  assert.equal(preview.summary.lotRows, 1307)
  assert.equal(preview.summary.createCount, 418)
  assert.equal(preview.summary.lotCreateCount, 1307)
  assert.equal(preview.summary.negativeCount, 39)
  assert.equal(preview.summary.lotMismatchCount, 80)
  assert.equal(preview.summary.errorCount, 0)
})
