import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { buildProductPreview } from '../src/product-preview.js'
import { parseExpressSuppliers } from '../src/supplier-parser.js'

const realFile = new URL('../../../private-data/express-export/raw/express_products_2026-08-12.csv', import.meta.url)
const supplierFile = new URL('../../../private-data/express-export/raw/express_suppliers_2026-08-04.csv', import.meta.url)

test('validates all Supplier references in the real Product file', () => {
  const fileBuffer = fs.readFileSync(realFile)
  const supplierCodes = parseExpressSuppliers(fs.readFileSync(supplierFile)).suppliers.map((item) => item.supplierCode)
  const preview = buildProductPreview({ fileName: 'products.csv', fileBuffer, supplierCodes })
  assert.equal(preview.summary.totalRows, 1598)
  assert.equal(preview.summary.categoryRows, 13)
  assert.equal(preview.summary.createCount, 1598)
  assert.equal(preview.errors.length, 0)
})
