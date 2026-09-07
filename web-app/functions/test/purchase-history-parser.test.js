import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parseExpressPurchaseHistory } from '../src/purchase-history-parser.js'

const sourceFile = new URL('../../../private-data/express-export/raw/express_purchase_2026-08-31.csv', import.meta.url)

test('parses the real Express Purchase History report', () => {
  const result = parseExpressPurchaseHistory(readFileSync(sourceFile))
  assert.equal(result.errors.length, 0)
  assert.equal(result.periodStart, '2025-01-01')
  assert.equal(result.periodEnd, '2026-12-31')
  assert.equal(result.rows.length, 3858)
  assert.equal(result.rows.filter((row) => row.isReturn).length, 6)
  assert.ok(result.rows.every((row) => row.productCode !== '---------------'))
})
