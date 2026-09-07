import iconv from 'iconv-lite'
import { parse } from 'csv-parse/sync'

function cleanText(value) {
  if (value === undefined || value === null) return null
  const cleaned = String(value).trim()
  return cleaned === '' ? null : cleaned
}

function cleanBrokenDescription(value) {
  return cleanText(value
    ?.replace(/^"/, '')
    .replace(/"$/, '')
    .replaceAll('""', '"'))
}

function numberValue(value, field, rowNumber, errors) {
  const cleaned = cleanText(value)
  if (!cleaned) return null
  const number = Number(cleaned.replaceAll(',', ''))
  if (!Number.isFinite(number) || number < 0) {
    errors.push({ rowNumber, field, message: `ค่า ${cleaned} ไม่ใช่ตัวเลขที่ถูกต้อง` })
    return null
  }
  return number
}

function parseProductLine(line, rowNumber, errors) {
  const codeMatch = line.match(/^"","","","([^"]+)",/)
  if (!codeMatch || codeMatch[1] === 'รหัส') return null
  const marker = '","","","","","ย่อย","'
  const markerIndex = line.lastIndexOf(marker)
  if (markerIndex < 0) {
    errors.push({ rowNumber, field: 'file', message: `ไม่สามารถอ่านโครงสร้างสินค้า ${codeMatch[1]} ได้` })
    return null
  }

  const descriptionStart = codeMatch[0].length + 1
  const productName = cleanBrokenDescription(line.slice(descriptionStart, markerIndex))
  const suffix = `"${line.slice(markerIndex + marker.length)}`
  let fields
  try {
    fields = parse(suffix, { relax_quotes: true, relax_column_count: true })[0]
  } catch {
    errors.push({ rowNumber, field: 'file', message: `ไม่สามารถอ่านรายละเอียดสินค้า ${codeMatch[1]} ได้` })
    return null
  }

  return {
    productCode: cleanText(codeMatch[1]),
    productName,
    smallUnit: cleanText(fields[0]),
    accountCode: cleanText(fields[2]),
    standardPrice: numberValue(fields[3], 'standardPrice', rowNumber, errors),
    replacementText: cleanText(fields[4]),
    supplierCode: cleanText(fields[5]),
    sourceRowNumber: rowNumber
  }
}

export function parseExpressProducts(fileBuffer) {
  const text = iconv.decode(fileBuffer, 'windows-874')
  const lines = text.split(/\r?\n/)
  const products = []
  const categories = new Map()
  const errors = []
  const productCodes = new Map()
  let category = null
  let current = null

  lines.forEach((line, index) => {
    const rowNumber = index + 1
    let row
    try {
      row = parse(line, { relax_quotes: true, relax_column_count: true })[0] || []
    } catch {
      row = []
    }

    const categoryCode = cleanText(row[1])
    const categoryName = cleanText(row[2])
    if (categoryCode && categoryName && row.length <= 3 && !categoryCode.includes('บริษัท') && !categoryCode.includes('รายงาน')) {
      category = { categoryCode, categoryName, sourceRowNumber: rowNumber }
      categories.set(categoryCode, category)
      current = null
      return
    }

    const product = parseProductLine(line, rowNumber, errors)
    if (product) {
      current = {
        ...product,
        categoryCode: category?.categoryCode || null,
        categoryName: category?.categoryName || null,
        largeDescription: null,
        largeUnit: null,
        purchaseUnit: null,
        purchaseFactor: null,
        salesUnit: null,
        salesFactor: null
      }
      products.push(current)
      if (!category) errors.push({ rowNumber, field: 'categoryCode', message: `สินค้า ${product.productCode} ไม่มีหมวดสินค้า` })
      if (productCodes.has(product.productCode)) {
        errors.push({ rowNumber, field: 'productCode', message: `รหัส ${product.productCode} ซ้ำกับบรรทัด ${productCodes.get(product.productCode)}` })
      } else {
        productCodes.set(product.productCode, rowNumber)
      }
      return
    }

    if (!current) return
    const unitType = cleanText(row[9])
    if (unitType === 'ใหญ่') {
      current.largeDescription = cleanText(row[4])
      current.largeUnit = cleanText(row[10])
    } else if (unitType === 'ซื้อ') {
      current.purchaseUnit = cleanText(row[10])
      current.purchaseFactor = numberValue(row[11], 'purchaseFactor', rowNumber, errors)
    } else if (unitType === 'ขาย') {
      current.salesUnit = cleanText(row[10])
      current.salesFactor = numberValue(row[11], 'salesFactor', rowNumber, errors)
    }
  })

  if (products.length === 0) errors.push({ rowNumber: null, field: 'file', message: 'ไม่พบรายการ Product ในรูปแบบรายงาน Express' })
  return { products, categories: [...categories.values()], errors }
}
