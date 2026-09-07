import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { parseExpressCustomers } from '../src/customer-parser.js'
import { parseExpressProducts } from '../src/product-parser.js'
import { buildSalesHistoryPreview } from '../src/sales-history-preview.js'

const salesFile = new URL('../../../private-data/express-export/raw/express_sales_history_2026-08-14.csv', import.meta.url)
const productFile = new URL('../../../private-data/express-export/raw/express_products_2026-08-12.csv', import.meta.url)
const customerFile = new URL('../../../private-data/express-export/raw/express_customers_2026-08-14.csv', import.meta.url)

test('builds a Sales History preview and validates master references', () => {
  const products = parseExpressProducts(fs.readFileSync(productFile)).products
  const customerCodes = parseExpressCustomers(fs.readFileSync(customerFile)).customers.map((row) => row.customerCode)
  const preview = buildSalesHistoryPreview({
    fileName: 'sales.csv', fileBuffer: fs.readFileSync(salesFile),
    products, customerCodes
  })
  assert.equal(preview.isValid, true)
  assert.equal(preview.summary.totalRows, 4497)
  assert.equal(preview.summary.createCount, 4497)
  assert.equal(preview.summary.returnCount, 11)
})
