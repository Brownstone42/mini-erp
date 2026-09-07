import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { importProductSnapshot } from '../src/product-import.js'
import { parseExpressSuppliers } from '../src/supplier-parser.js'

const productFile = new URL('../../../private-data/express-export/raw/express_products_2026-08-12.csv', import.meta.url)
const supplierFile = new URL('../../../private-data/express-export/raw/express_suppliers_2026-08-04.csv', import.meta.url)

test('imports Product categories and products in one transaction', async () => {
  const fileBuffer = fs.readFileSync(productFile)
  const { createHash } = await import('node:crypto')
  const previewId = createHash('sha256').update(fileBuffer).digest('hex')
  const supplierCodes = parseExpressSuppliers(fs.readFileSync(supplierFile)).suppliers.map((item) => item.supplierCode)
  let mutationCall

  const result = await importProductSnapshot({
    dataConnect: { executeMutation: async (name, variables) => { mutationCall = { name, variables } } },
    fileName: 'products.csv', fileBuffer, previewId, importedByUid: 'user-1',
    existingProducts: [], existingCategories: [], supplierCodes,
    findImportByHash: async () => ({ data: { productImportRuns: [] } })
  })

  assert.equal(mutationCall.name, 'AdminImportProducts')
  assert.equal(mutationCall.variables.products.length, 1598)
  assert.equal(mutationCall.variables.categories.length, 13)
  assert.equal(mutationCall.variables.products[0].categoryCode, 'A')
  assert.equal(result.alreadyImported, false)
})
