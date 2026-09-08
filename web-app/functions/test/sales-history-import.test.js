import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import test from 'node:test'
import { parseExpressCustomers } from '../src/customer-parser.js'
import { importSalesHistorySnapshot } from '../src/sales-history-import.js'
import { parseExpressProducts } from '../src/product-parser.js'

const salesFile = new URL('../../../private-data/express-export/raw/express_sales_history_2026-09-08(2).csv', import.meta.url)
const productFile = new URL('../../../private-data/express-export/raw/express_products_2026-09-08.csv', import.meta.url)
const customerFile = new URL('../../../private-data/express-export/raw/express_customers_2026-09-08.csv', import.meta.url)

test('imports Sales History larger than the Data Connect row limit in batches', async () => {
  const fileBuffer = fs.readFileSync(salesFile)
  const previewId = createHash('sha256').update(fileBuffer).digest('hex')
  const products = parseExpressProducts(fs.readFileSync(productFile)).products
  const customerCodes = parseExpressCustomers(fs.readFileSync(customerFile)).customers.map((row) => row.customerCode)
  const mutationCalls = []

  const result = await importSalesHistorySnapshot({
    dataConnect: {
      executeMutation: async (name, variables) => mutationCalls.push({ name, variables })
    },
    fileName: 'sales.csv',
    fileBuffer,
    previewId,
    importedByUid: 'user-1',
    existingRows: [],
    products,
    customerCodes,
    findImportByHash: async () => ({ data: { salesHistoryImportRuns: [] } })
  })

  assert.deepEqual(mutationCalls.slice(0, 3).map((call) => call.name), [
    'AdminUpsertSalesHistoryBatch',
    'AdminUpsertSalesHistoryBatch',
    'AdminUpsertSalesHistoryBatch'
  ])
  assert.deepEqual(mutationCalls.slice(0, 3).map((call) => call.variables.rows.length), [5000, 5000, 1028])
  assert.equal(mutationCalls[3].name, 'AdminFinalizeSalesHistoryImport')
  assert.equal(mutationCalls[3].variables.sourceKeys.length, 11028)
  assert.equal(result.summary.totalRows, 11028)
  assert.equal(result.alreadyImported, false)
})
