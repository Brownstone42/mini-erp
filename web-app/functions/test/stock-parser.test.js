import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { parseExpressStock } from '../src/stock-parser.js'

const sourceFile = new URL('../../../private-data/express-export/raw/express_stock_2026-09-07.csv', import.meta.url)

test('parses the real Express stock snapshot and reconciles its control totals', () => {
  const result = parseExpressStock(fs.readFileSync(sourceFile))
  assert.equal(result.snapshotDate, '2026-09-07')
  assert.equal(result.warehouseFrom, '01')
  assert.equal(result.warehouseTo, '01')
  assert.equal(result.rows.length, 418)
  assert.equal(result.lots.length, 1307)
  assert.equal(result.rows.filter((row) => row.lotMismatch).length, 80)
  assert.equal(result.rows.reduce((total, row) => total + row.quantity, 0), 894911)
  assert.ok(Math.abs(result.rows.reduce((total, row) => total + row.inventoryValue, 0) - 3706723.37) < 0.01)
  assert.deepEqual(result.errors, [])
})

test('recovers product names containing unescaped quotes and commas', () => {
  const result = parseExpressStock(fs.readFileSync(sourceFile))
  const row = result.rows.find((item) => item.productCode === 'A-NTG-BL-009L-2000')
  assert.equal(row.productName, 'NITRILE BLUE 9"(5g.):L Max Guard (-2,500)')
  assert.equal(row.quantity, 3200)
  assert.equal(row.sourceUnitText, 'คู่')
  assert.equal(row.inventoryValue, 6030)
})
