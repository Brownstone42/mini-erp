import { createHash } from 'node:crypto'
import { parseExpressProducts } from './product-parser.js'

const PRODUCT_FIELDS = [
  'productName', 'largeDescription', 'smallUnit', 'largeUnit', 'purchaseUnit',
  'purchaseFactor', 'salesUnit', 'salesFactor', 'accountCode', 'standardPrice', 'replacementText'
]

function comparable(value) {
  return value === undefined || value === '' ? null : value
}

function classify(incoming, existing, fields, relationChanged = false) {
  if (!existing) return 'create'
  if (existing.isActive === false) return 'reactivate'
  if (relationChanged || fields.some((field) => comparable(incoming[field]) !== comparable(existing[field]))) return 'update'
  return 'unchanged'
}

export function buildProductPreview({
  fileName,
  fileBuffer,
  existingProducts = [],
  existingCategories = [],
  supplierCodes = []
}) {
  const parsed = parseExpressProducts(fileBuffer)
  const errors = [...parsed.errors]
  const validSuppliers = new Set(supplierCodes)
  parsed.products.forEach((product) => {
    if (product.supplierCode && !validSuppliers.has(product.supplierCode)) {
      errors.push({
        rowNumber: product.sourceRowNumber,
        field: 'supplierCode',
        message: `ไม่พบ Supplier ${product.supplierCode} ใน Supplier Master Data`
      })
    }
  })

  const existingProductMap = new Map(existingProducts.map((item) => [item.productCode, item]))
  const existingCategoryMap = new Map(existingCategories.map((item) => [item.categoryCode, item]))
  const incomingProductCodes = new Set(parsed.products.map((item) => item.productCode))
  const incomingCategoryCodes = new Set(parsed.categories.map((item) => item.categoryCode))
  const summary = {
    totalRows: parsed.products.length,
    categoryRows: parsed.categories.length,
    createCount: 0,
    updateCount: 0,
    reactivateCount: 0,
    unchangedCount: 0,
    deactivateCount: 0,
    errorCount: errors.length
  }

  const rows = parsed.products.map((product) => {
    const existing = existingProductMap.get(product.productCode)
    const changeType = classify(
      product,
      existing,
      PRODUCT_FIELDS,
      existing && (existing.category?.categoryCode !== product.categoryCode || (existing.supplier?.supplierCode || null) !== product.supplierCode)
    )
    summary[`${changeType}Count`] += 1
    return { ...product, changeType }
  })

  const categories = parsed.categories.map((category) => {
    const existing = existingCategoryMap.get(category.categoryCode)
    return {
      ...category,
      changeType: classify(category, existing, ['categoryName'])
    }
  })

  summary.deactivateCount = existingProducts.filter((item) => item.isActive && !incomingProductCodes.has(item.productCode)).length
  const deactivateCategoryCount = existingCategories.filter((item) => item.isActive && !incomingCategoryCodes.has(item.categoryCode)).length

  return {
    previewId: createHash('sha256').update(fileBuffer).digest('hex'),
    fileName,
    isValid: errors.length === 0,
    summary: { ...summary, deactivateCategoryCount },
    errors,
    rows,
    categories
  }
}
