import iconv from 'iconv-lite'
import { parse } from 'csv-parse/sync'

const PRODUCT_CODE = /^[A-Z0-9]+(?:-[A-Z0-9]+){3,}$/i
const THAI_MONTHS = new Map([
  ['ม.ค.', 1], ['ก.พ.', 2], ['มี.ค.', 3], ['เม.ย.', 4], ['พ.ค.', 5], ['มิ.ย.', 6],
  ['ก.ค.', 7], ['ส.ค.', 8], ['ก.ย.', 9], ['ต.ค.', 10], ['พ.ย.', 11], ['ธ.ค.', 12]
])
const THAI_MONTH_PATTERN = 'ม\\.ค\\.|ก\\.พ\\.|มี\\.ค\\.|เม\\.ย\\.|พ\\.ค\\.|มิ\\.ย\\.|ก\\.ค\\.|ส\\.ค\\.|ก\\.ย\\.|ต\\.ค\\.|พ\\.ย\\.|ธ\\.ค\\.'

function clean(value) {
  if (value === undefined || value === null) return null
  return String(value).replaceAll('\u00a0', ' ').trim() || null
}

function number(value, field, rowNumber, errors, required = true) {
  const source = clean(value)
  if (!source) {
    if (required) errors.push({ rowNumber, field, message: `ไม่พบค่า ${field}` })
    return null
  }
  const result = Number(source.replaceAll(',', ''))
  if (!Number.isFinite(result)) errors.push({ rowNumber, field, message: `ค่า ${source} ไม่ใช่ตัวเลขที่ถูกต้อง` })
  return Number.isFinite(result) ? result : null
}

function buddhistDate(value, field, rowNumber, errors) {
  const match = clean(value)?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) {
    errors.push({ rowNumber, field, message: `วันที่ ${value || '-'} ไม่ถูกต้อง` })
    return null
  }
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3]) - 543
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    errors.push({ rowNumber, field, message: `วันที่ ${value} ไม่ถูกต้อง` })
    return null
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function monthDate(day, monthText, buddhistYear, rowNumber, field, errors) {
  const month = THAI_MONTHS.get(monthText)
  if (!month) return null
  return buddhistDate(`${day}/${month}/${buddhistYear}`, field, rowNumber, errors)
}

function parseColumns(line, rowNumber, errors) {
  try { return parse(line, { relax_quotes: true, relax_column_count: true })[0] || [] } catch {
    errors.push({ rowNumber, field: 'file', message: 'ไม่สามารถอ่านคอลัมน์ CSV' })
    return []
  }
}

function productHeader(line) {
  // Express does not escape quotes or commas in product names. The code is the final field.
  const match = line.match(/^"","(.*)","([^"]+)"\s*$/)
  if (!match || !PRODUCT_CODE.test(clean(match[2]) || '')) return null
  return { productName: clean(match[1].replaceAll('""', '"')), productCode: clean(match[2]) }
}

function detailCustomerAndQuantity(columns) {
  const customer = clean(columns[7])
  if (clean(columns[8])) return { customerName: customer, orderedQuantityText: columns[8] }
  // Express occasionally appends the quantity to a long customer name instead of
  // writing it into the next CSV column. Require a wide spacing boundary so a
  // number that is part of the customer's name is not mistaken for a quantity.
  const overflow = customer?.match(/^(.*?)\s{2,}([+-]?\d[\d,]*(?:\.\d+)?)$/)
  return overflow
    ? { customerName: clean(overflow[1]), orderedQuantityText: overflow[2] }
    : { customerName: customer, orderedQuantityText: columns[8] }
}

export function parseExpressPendingOrders(fileBuffer) {
  const lines = iconv.decode(fileBuffer, 'windows-874').split(/\r?\n/)
  const rows = []
  const products = []
  const warnings = []
  const errors = []
  let periodStart = null
  let periodEnd = null
  let reportDate = null
  let warehouseFrom = null
  let warehouseTo = null
  let customerFrom = null
  let customerTo = null
  let customerScopeFound = false
  let reportTypeFound = false
  let reportControl = null
  let currentProduct = null

  lines.forEach((line, index) => {
    const rowNumber = index + 1
    const normalized = line.replaceAll('\u00a0', ' ')
    if (normalized.includes('รายงานสินค้าค้างส่ง') && normalized.includes('แยกตามสินค้า')) reportTypeFound = true

    if (normalized.includes('ส่งของวันที่')) {
      const datePattern = new RegExp(`(\\d{1,2})\\s*(${THAI_MONTH_PATTERN})\\s*(\\d{4})`, 'g')
      const dates = [...normalized.matchAll(datePattern)]
      if (dates.length >= 2) {
        periodStart = monthDate(dates[0][1], dates[0][2], dates[0][3], rowNumber, 'periodStart', errors)
        periodEnd = monthDate(dates[1][1], dates[1][2], dates[1][3], rowNumber, 'periodEnd', errors)
      }
    }
    const reportDateMatch = normalized.match(/วันที่\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/)
    if (reportDateMatch) reportDate = buddhistDate(reportDateMatch[1], 'reportDate', rowNumber, errors)
    const warehouseMatch = normalized.match(/คลังสินค้าจาก\s+([A-Z0-9-]+)\s+ถึง\s+([A-Z0-9-]+)/i)
    if (warehouseMatch) {
      warehouseFrom = clean(warehouseMatch[1])
      warehouseTo = clean(warehouseMatch[2])
    }
    const customerMatch = normalized.match(/ลูกค้าจาก\s*(.*?)\s+ถึง\s*(.*?)\s+เลือกแผนก/)
    if (customerMatch) {
      customerScopeFound = true
      customerFrom = clean(customerMatch[1])
      customerTo = clean(customerMatch[2])
    }

    const header = productHeader(line)
    if (header) {
      currentProduct = { ...header, sourceRowNumber: rowNumber, detailRows: [], subtotal: null }
      products.push(currentProduct)
      return
    }

    const columns = parseColumns(line, rowNumber, errors)
    if (clean(columns[1]) === 'รวมทั้งสิ้น') {
      reportControl = {
        orderedQuantity: number(columns[8], 'reportOrderedQuantity', rowNumber, errors),
        pendingQuantity: number(columns[10], 'reportPendingQuantity', rowNumber, errors),
        amount: number(columns[11], 'reportAmount', rowNumber, errors)
      }
      currentProduct = null
      return
    }
    if (clean(columns[1]) === 'รวม' && currentProduct) {
      const tail = columns.slice(-7)
      currentProduct.subtotal = {
        orderedQuantity: number(tail[0], 'productOrderedQuantity', rowNumber, errors),
        pendingQuantity: number(tail[2], 'productPendingQuantity', rowNumber, errors),
        amount: number(tail[3], 'productAmount', rowNumber, errors),
        reportedOnHandQuantity: number(tail[4], 'reportedOnHandQuantity', rowNumber, errors, false),
        reportedOnHandUnitText: clean(tail[5]),
        reportedPurchaseQuantity: number(tail[6], 'reportedPurchaseQuantity', rowNumber, errors, false)
      }
      return
    }

    if (!/^SO\d{7}-\s*\d+$/i.test(clean(columns[5]) || '')) {
      if (/SO\d{7}-/.test(line)) errors.push({ rowNumber, field: 'documentNumber', message: 'ไม่สามารถอ่านรายการใบสั่งขาย' })
      return
    }
    if (!currentProduct) {
      errors.push({ rowNumber, field: 'productCode', message: 'ไม่พบสินค้าเจ้าของรายการค้างส่ง' })
      return
    }
    const detail = detailCustomerAndQuantity(columns)
    const row = {
      sourceRowNumber: rowNumber,
      productCode: currentProduct.productCode,
      productName: currentProduct.productName,
      warehouseCode: clean(columns[3]),
      deliveryDate: buddhistDate(columns[4], 'deliveryDate', rowNumber, errors),
      documentNumber: clean(columns[5]),
      orderDate: buddhistDate(columns[6], 'orderDate', rowNumber, errors),
      customerName: detail.customerName,
      orderedQuantity: number(detail.orderedQuantityText, 'orderedQuantity', rowNumber, errors),
      sourceUnitText: clean(columns[9]),
      pendingQuantity: number(columns[10], 'pendingQuantity', rowNumber, errors),
      amount: number(columns[11], 'amount', rowNumber, errors)
    }
    for (const field of ['warehouseCode', 'customerName', 'sourceUnitText']) {
      if (!row[field]) errors.push({ rowNumber, field, message: `ไม่พบค่า ${field}` })
    }
    rows.push(row)
    currentProduct.detailRows.push(row)
  })

  if (!reportTypeFound) errors.push({ rowNumber: null, field: 'file', message: 'ไม่ใช่รายงานสินค้าค้างส่งแยกตามสินค้า' })
  if (!periodStart || !periodEnd) errors.push({ rowNumber: null, field: 'period', message: 'ไม่พบช่วงวันที่ส่งของในหัวรายงาน Express' })
  if (!reportDate) errors.push({ rowNumber: null, field: 'reportDate', message: 'ไม่พบวันที่พิมพ์รายงาน Express' })
  if (!warehouseFrom || !warehouseTo) errors.push({ rowNumber: null, field: 'warehouse', message: 'ไม่พบช่วงคลังในหัวรายงาน Express' })
  if (!customerScopeFound) errors.push({ rowNumber: null, field: 'customer', message: 'ไม่พบช่วงลูกค้าในหัวรายงาน Express' })
  if (!rows.length) errors.push({ rowNumber: null, field: 'file', message: 'ไม่พบรายการสินค้าค้างส่งในรายงาน Express' })
  if (periodStart && periodEnd && periodStart > periodEnd) errors.push({ rowNumber: null, field: 'period', message: 'วันที่เริ่มมากกว่าวันสิ้นสุด' })
  if (reportDate && periodEnd && periodEnd < reportDate) warnings.push({ rowNumber: null, field: 'period', message: 'ช่วงวันที่ส่งของสิ้นสุดก่อนวันที่พิมพ์รายงาน อาจไม่ครอบคลุมรายการกำหนดส่งล่าสุด' })

  for (const product of products) {
    if (!product.subtotal) {
      errors.push({ rowNumber: product.sourceRowNumber, field: 'subtotal', message: `ไม่พบบรรทัดรวมของสินค้า ${product.productCode}` })
      continue
    }
    for (const [field, tolerance] of [['orderedQuantity', 0.0001], ['pendingQuantity', 0.0001], ['amount', 0.01]]) {
      const detailTotal = product.detailRows.reduce((total, row) => total + (row[field] || 0), 0)
      if (Math.abs(detailTotal - product.subtotal[field]) > tolerance) errors.push({ rowNumber: product.sourceRowNumber, field: 'subtotal', message: `ยอด ${field} ของสินค้า ${product.productCode} ไม่ตรงกับบรรทัดรวม` })
    }
    if (product.detailRows.some((row) => row.sourceUnitText !== product.subtotal.reportedOnHandUnitText)) {
      warnings.push({ rowNumber: product.sourceRowNumber, field: 'unit', productCode: product.productCode, message: 'หน่วยค้างส่งต่างจากหน่วยยอดในมือ ห้ามหักจำนวนตรง ๆ' })
    }
  }
  if (!reportControl) errors.push({ rowNumber: null, field: 'controlTotal', message: 'ไม่พบยอดรวมท้ายรายงาน Express' })
  else for (const [field, tolerance] of [['orderedQuantity', 0.0001], ['pendingQuantity', 0.0001], ['amount', 0.01]]) {
    const detailTotal = rows.reduce((total, row) => total + (row[field] || 0), 0)
    if (Math.abs(detailTotal - reportControl[field]) > tolerance) errors.push({ rowNumber: null, field: 'controlTotal', message: `ยอด ${field} ไม่ตรงกับยอดรวมท้ายรายงาน` })
  }

  return { reportDate, periodStart, periodEnd, warehouseFrom, warehouseTo, customerFrom, customerTo, rows, products, reportControl, warnings, errors }
}
