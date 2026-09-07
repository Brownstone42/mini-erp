import { createHash } from 'node:crypto'
import iconv from 'iconv-lite'
import { parse } from 'csv-parse/sync'

const THAI_MONTHS = new Map([
  ['ม.ค.', 1], ['ก.พ.', 2], ['มี.ค.', 3], ['เม.ย.', 4], ['พ.ค.', 5], ['มิ.ย.', 6],
  ['ก.ค.', 7], ['ส.ค.', 8], ['ก.ย.', 9], ['ต.ค.', 10], ['พ.ย.', 11], ['ธ.ค.', 12]
])

function cleanText(value) {
  if (value === undefined || value === null) return null
  const cleaned = String(value).replaceAll('\u00a0', ' ').trim()
  return cleaned === '' ? null : cleaned
}

function cleanProductName(value) {
  return cleanText(value?.replace(/^"/, '').replace(/"$/, '').replaceAll('""', '"'))
}

function parseNumber(value, field, rowNumber, errors) {
  const cleaned = cleanText(value)
  if (!cleaned) return null
  const number = Number(cleaned.replaceAll(',', ''))
  if (!Number.isFinite(number)) {
    errors.push({ rowNumber, field, message: `ค่า ${cleaned} ไม่ใช่ตัวเลขที่ถูกต้อง` })
    return null
  }
  return number
}

function isoDateFromBuddhist(text, rowNumber, errors) {
  const match = cleanText(text)?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, day, month, buddhistYear] = match
  const year = Number(buddhistYear) - 543
  const date = new Date(Date.UTC(year, Number(month) - 1, Number(day)))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) {
    errors.push({ rowNumber, field: 'transactionDate', message: `วันที่ ${text} ไม่ถูกต้อง` })
    return null
  }
  return `${year}-${month}-${day}`
}

function parseHeaderDate(text) {
  const normalized = cleanText(text)
  const match = normalized?.match(/(\d{1,2})\s+(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+(\d{4})/)
  if (!match) return null
  const [, day, monthText, buddhistYear] = match
  const month = String(THAI_MONTHS.get(monthText)).padStart(2, '0')
  return `${Number(buddhistYear) - 543}-${month}-${String(Number(day)).padStart(2, '0')}`
}

function productHeader(line) {
  const match = line.match(/^"","(.*)","([^"\s]+-[^"]+)"\s*$/)
  if (!match) return null
  return { productName: cleanProductName(match[1]), productCode: cleanText(match[2]) }
}

export function parseExpressSalesHistory(fileBuffer) {
  const text = iconv.decode(fileBuffer, 'windows-874')
  const lines = text.split(/\r?\n/)
  const rows = []
  const errors = []
  const occurrenceByIdentity = new Map()
  let currentProduct = null
  let periodStart = null
  let periodEnd = null

  lines.forEach((line, index) => {
    const rowNumber = index + 1
    if (line.includes('จากวันที่')) {
      const parts = line.replaceAll('\u00a0', ' ').split('ถึง')
      periodStart = parseHeaderDate(parts[0])
      periodEnd = parseHeaderDate(parts[1])
    }

    const header = productHeader(line)
    if (header) {
      currentProduct = header
      return
    }

    let row
    try {
      row = parse(line, { relax_quotes: true, relax_column_count: true })[0] || []
    } catch {
      return
    }
    const sourceDate = cleanText(row[3])
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(sourceDate || '')) return
    if (!currentProduct) {
      errors.push({ rowNumber, field: 'productCode', message: 'ไม่พบสินค้าเจ้าของรายการขาย' })
      return
    }

    const documentNumber = cleanText(row[4])
    const customerCode = cleanText(row[5])
    const referenceText = cleanText(row[15])
    const baseIdentity = [documentNumber, currentProduct.productCode, referenceText || ''].join('|')
    const occurrence = (occurrenceByIdentity.get(baseIdentity) || 0) + 1
    occurrenceByIdentity.set(baseIdentity, occurrence)
    const sourceKey = createHash('sha256').update(`${baseIdentity}|${occurrence}`).digest('hex')
    const sourceQuantity = parseNumber(row[6], 'sourceQuantity', rowNumber, errors)
    const isReturn = cleanText(row[8]) === 'Y'
    const netAmount = parseNumber(row[14], 'netAmount', rowNumber, errors)

    rows.push({
      sourceKey,
      sourceOccurrence: occurrence,
      sourceRowNumber: rowNumber,
      sourceDate,
      transactionDate: isoDateFromBuddhist(sourceDate, rowNumber, errors),
      documentNumber,
      productCode: currentProduct.productCode,
      productName: currentProduct.productName,
      customerCode,
      sourceQuantity,
      sourceUnitText: cleanText(row[7]),
      isReturn,
      unitPrice: parseNumber(row[9], 'unitPrice', rowNumber, errors),
      sourceVatCode: cleanText(row[10]),
      lineDiscountText: cleanText(row[11]),
      grossAmount: parseNumber(row[12], 'grossAmount', rowNumber, errors),
      overallDiscountText: cleanText(row[13]),
      netAmount,
      referenceText,
      noteText: cleanText(row[16]),
      signedSourceQuantity: sourceQuantity == null ? null : (isReturn ? -sourceQuantity : sourceQuantity),
      signedNetAmount: netAmount == null ? null : (isReturn ? -netAmount : netAmount)
    })
  })

  if (!periodStart || !periodEnd) errors.push({ rowNumber: null, field: 'period', message: 'ไม่พบช่วงวันที่ในหัวรายงาน Express' })
  if (rows.length === 0) errors.push({ rowNumber: null, field: 'file', message: 'ไม่พบรายการ Sales History ในรายงาน Express' })
  return { periodStart, periodEnd, rows, errors }
}
