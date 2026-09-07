import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { parseExpressSalesHistory } from '../src/sales-history-parser.js'

const realFile = new URL('../../../private-data/express-export/raw/express_sales_history_2026-08-14.csv', import.meta.url)

test('parses the real Express Sales History report', () => {
  const result = parseExpressSalesHistory(fs.readFileSync(realFile))
  assert.equal(result.periodStart, '2025-12-01')
  assert.equal(result.periodEnd, '2026-12-31')
  assert.equal(result.rows.length, 4497)
  assert.equal(result.rows.filter((row) => row.isReturn).length, 11)
  assert.equal(result.errors.length, 0)
})

test('repairs malformed Product headers and signs returns for analysis', () => {
  const result = parseExpressSalesHistory(fs.readFileSync(realFile))
  assert.equal(result.rows.some((row) => row.productCode === 'A-NTG-BL-009L-2000'), true)
  const returned = result.rows.find((row) => row.isReturn)
  assert.equal(returned.sourceQuantity > 0, true)
  assert.equal(returned.signedSourceQuantity < 0, true)
  assert.equal(returned.signedNetAmount < 0, true)
})
