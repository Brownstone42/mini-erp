import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import iconv from 'iconv-lite'
import { parseExpressPendingOrders } from '../src/pending-orders-parser.js'

const sourceFile = new URL('../../../private-data/express-export/fixtures/express_pending_2026-09-18.csv', import.meta.url)
const yearEndSourceFile = new URL('../../../private-data/express-export/fixtures/express_pending_2026-09-18_2.csv', import.meta.url)

test('parses the available Express pending report without changing its quantities or units', { skip: !fs.existsSync(sourceFile) }, () => {
  const result = parseExpressPendingOrders(fs.readFileSync(sourceFile))
  assert.equal(result.reportDate, '2026-09-18')
  assert.equal(result.periodStart, '2025-01-01')
  assert.equal(result.periodEnd, '2026-08-31')
  assert.equal(result.warehouseFrom, '01')
  assert.equal(result.warehouseTo, '01')
  assert.equal(result.customerTo, 'AR01065')
  assert.equal(result.products.length, 11)
  assert.equal(result.rows.length, 13)
  assert.equal(result.reportControl.pendingQuantity, 7639)
  assert.equal(result.rows.reduce((total, row) => total + row.pendingQuantity, 0), 7639)
  assert.ok(Math.abs(result.rows.reduce((total, row) => total + row.amount, 0) - 577319.24) < 0.01)
  assert.equal(result.rows.find((row) => row.productCode === 'A-NTG-BL-009L-2000').productName, 'NITRILE BLUE 9"(5g.):L Max Guard (-2,500)')
  assert.equal(result.warnings.filter((warning) => warning.field === 'unit').length, 4)
  assert.deepEqual(result.errors, [])
})

test('rejects a different report instead of treating it as pending orders', () => {
  const result = parseExpressPendingOrders(iconv.encode('"","รายงานอื่น"', 'windows-874'))
  assert.ok(result.errors.some((error) => error.message === 'ไม่ใช่รายงานสินค้าค้างส่งแยกตามสินค้า'))
  assert.equal(result.rows.length, 0)
})

test('recovers quantities appended to long customer names in the year-end report', { skip: !fs.existsSync(yearEndSourceFile) }, () => {
  const result = parseExpressPendingOrders(fs.readFileSync(yearEndSourceFile))
  assert.equal(result.periodEnd, '2026-12-31')
  assert.equal(result.rows.length, 126)
  assert.equal(result.products.length, 93)
  assert.deepEqual(result.errors, [])
  assert.equal(result.rows.reduce((total, row) => total + row.orderedQuantity, 0), result.reportControl.orderedQuantity)
  assert.equal(result.rows.reduce((total, row) => total + row.pendingQuantity, 0), result.reportControl.pendingQuantity)
  assert.ok(Math.abs(result.rows.reduce((total, row) => total + row.amount, 0) - result.reportControl.amount) < 0.01)
  const affectedRow = result.rows.find((row) => row.sourceRowNumber === 9)
  assert.equal(affectedRow.orderedQuantity, 360)
  assert.ok(!affectedRow.customerName.endsWith('360'))
})
