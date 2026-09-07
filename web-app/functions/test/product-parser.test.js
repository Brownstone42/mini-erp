import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { parseExpressProducts } from '../src/product-parser.js'

const realFile = new URL('../../../private-data/express-export/raw/express_products_2026-08-12.csv', import.meta.url)

test('parses all products and categories from the real Express report', () => {
  const result = parseExpressProducts(fs.readFileSync(realFile))
  assert.equal(result.products.length, 1598)
  assert.equal(result.categories.length, 13)
  assert.equal(new Set(result.products.map((item) => item.productCode)).size, 1598)
  assert.equal(result.errors.length, 0)
})

test('repairs product names containing unescaped quotes and commas', () => {
  const result = parseExpressProducts(fs.readFileSync(realFile))
  const product = result.products.find((item) => item.productCode === 'A-NTG-BL-009L-2000')
  assert.equal(product.productName, 'NITRILE BLUE 9"(5g.):L Max Guard (-2,500)')
  assert.equal(product.smallUnit, 'คู่')
  assert.equal(product.accountCode, 'ST01')
})
