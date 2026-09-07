import { createHash } from 'node:crypto'
import iconv from 'iconv-lite'
import { parse } from 'csv-parse/sync'

const THAI_MONTHS = new Map([
  ['ม.ค.', 1], ['ก.พ.', 2], ['มี.ค.', 3], ['เม.ย.', 4], ['พ.ค.', 5], ['มิ.ย.', 6],
  ['ก.ค.', 7], ['ส.ค.', 8], ['ก.ย.', 9], ['ต.ค.', 10], ['พ.ย.', 11], ['ธ.ค.', 12]
])

function clean(value) {
  if (value === undefined || value === null) return null
  const result = String(value).replaceAll('\u00a0', ' ').trim()
  return result || null
}

function number(value, field, rowNumber, errors) {
  const valueText = clean(value)
  if (!valueText) return null
  const result = Number(valueText.replaceAll(',', ''))
  if (!Number.isFinite(result)) errors.push({ rowNumber, field, message: `ค่า ${valueText} ไม่ใช่ตัวเลขที่ถูกต้อง` })
  return Number.isFinite(result) ? result : null
}

function transactionDate(value, rowNumber, errors) {
  const match = clean(value)?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const year = Number(match[3]) - 543
  const date = new Date(Date.UTC(year, Number(match[2]) - 1, Number(match[1])))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[1])) {
    errors.push({ rowNumber, field: 'transactionDate', message: `วันที่ ${value} ไม่ถูกต้อง` })
    return null
  }
  return `${year}-${match[2]}-${match[1]}`
}

function headerDate(value) {
  const match = clean(value)?.match(/(\d{1,2})\s+(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+(\d{4})/)
  if (!match) return null
  return `${Number(match[3]) - 543}-${String(THAI_MONTHS.get(match[2])).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`
}

function productHeader(line) {
  const match = line.match(/^"","(.*)","([^"\s]+-[^"]+)"\s*$/)
  if (!match) return null
  const productCode = clean(match[2])
  if (!/[A-Za-z0-9]/.test(productCode || '')) return null
  return { productName: clean(match[1]?.replace(/^"/, '').replace(/"$/, '').replaceAll('""', '"')), productCode }
}

export function parseExpressPurchaseHistory(fileBuffer) {
  const lines = iconv.decode(fileBuffer, 'windows-874').split(/\r?\n/)
  const rows = []
  const errors = []
  const occurrences = new Map()
  let currentProduct = null
  let periodStart = null
  let periodEnd = null

  lines.forEach((line, index) => {
    const rowNumber = index + 1
    if (line.includes('จากวันที่')) {
      const parts = line.replaceAll('\u00a0', ' ').split('ถึง')
      periodStart = headerDate(parts[0])
      periodEnd = headerDate(parts[1])
    }
    const header = productHeader(line)
    if (header) { currentProduct = header; return }
    let columns
    try { columns = parse(line, { relax_quotes: true, relax_column_count: true })[0] || [] } catch { return }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(clean(columns[3]) || '')) return
    if (!currentProduct) { errors.push({ rowNumber, field: 'productCode', message: 'ไม่พบสินค้าเจ้าของรายการซื้อ' }); return }

    const documentNumber = clean(columns[4])
    const supplierCode = clean(columns[5])
    const referenceText = clean(columns[17])
    const identity = [documentNumber, currentProduct.productCode, referenceText || ''].join('|')
    const occurrence = (occurrences.get(identity) || 0) + 1
    occurrences.set(identity, occurrence)
    const sourceQuantity = number(columns[8], 'sourceQuantity', rowNumber, errors)
    const isReturn = clean(columns[10]) === 'Y'
    const netAmount = number(columns[16], 'netAmount', rowNumber, errors)
    rows.push({
      sourceKey: createHash('sha256').update(`${identity}|${occurrence}`).digest('hex'), sourceOccurrence: occurrence,
      sourceRowNumber: rowNumber, transactionDate: transactionDate(columns[3], rowNumber, errors), documentNumber,
      productCode: currentProduct.productCode, productName: currentProduct.productName, supplierCode,
      sourceQuantity, sourceUnitText: clean(columns[9]), isReturn,
      unitPrice: number(columns[11], 'unitPrice', rowNumber, errors), sourceVatCode: clean(columns[12]),
      lineDiscountText: clean(columns[13]), grossAmount: number(columns[14], 'grossAmount', rowNumber, errors),
      overallDiscountText: clean(columns[15]), netAmount, referenceText,
      signedSourceQuantity: sourceQuantity == null ? null : (isReturn ? -sourceQuantity : sourceQuantity),
      signedNetAmount: netAmount == null ? null : (isReturn ? -netAmount : netAmount)
    })
  })
  if (!periodStart || !periodEnd) errors.push({ rowNumber: null, field: 'period', message: 'ไม่พบช่วงวันที่ในหัวรายงาน Express' })
  if (!rows.length) errors.push({ rowNumber: null, field: 'file', message: 'ไม่พบรายการ Purchase History ในรายงาน Express' })
  return { periodStart, periodEnd, rows, errors }
}
