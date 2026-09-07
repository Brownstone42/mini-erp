import iconv from 'iconv-lite'
import { parse } from 'csv-parse/sync'

function cleanText(value) {
  if (value === undefined || value === null) return null
  const cleaned = String(value).trim()
  return cleaned === '' ? null : cleaned
}

function appendText(current, next) {
  const cleaned = cleanText(next)
  if (!cleaned) return current
  return current ? `${current} ${cleaned}` : cleaned
}

function parseCreditDays(value, rowNumber, errors) {
  const cleaned = cleanText(value)
  if (!cleaned) return null
  const match = cleaned.match(/\d+/)
  const number = match ? Number(match[0]) : Number.NaN
  if (!Number.isInteger(number) || number < 0) {
    errors.push({ rowNumber, field: 'creditDays', message: `ค่า ${cleaned} ไม่ใช่จำนวนวันเครดิตที่ถูกต้อง` })
    return null
  }
  return number
}

function parseCreditLimit(value, rowNumber, errors) {
  const cleaned = cleanText(value)
  if (!cleaned) return null
  const number = Number(cleaned.replaceAll(',', ''))
  if (!Number.isFinite(number) || number < 0) {
    errors.push({ rowNumber, field: 'creditLimit', message: `ค่า ${cleaned} ไม่ใช่วงเงินที่ถูกต้อง` })
    return null
  }
  return number
}

function isCustomerRow(row) {
  const code = cleanText(row[3])
  return code !== null && code !== 'รหัส' && cleanText(row[4]) !== null
}

export function parseExpressCustomers(fileBuffer) {
  const rows = parse(iconv.decode(fileBuffer, 'windows-874'), {
    bom: true,
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: false
  })
  const customers = []
  const errors = []
  const codes = new Map()
  let customerType = null
  let current = null

  rows.forEach((row, index) => {
    const rowNumber = index + 1
    if (cleanText(row[1]) === 'ประเภท:') {
      customerType = cleanText(row[2])
      return
    }

    if (isCustomerRow(row)) {
      const customerCode = cleanText(row[3])
      current = {
        customerCode,
        customerName: cleanText(row[4]),
        customerType,
        salespersonCode: cleanText(row[9]),
        salesTerritory: cleanText(row[10]),
        priceType: cleanText(row[11]),
        addressText: null,
        postalCode: null,
        contactName: null,
        expressAccountCode: null,
        shippingMethod: null,
        creditDays: null,
        creditLimit: null,
        phoneText: null,
        paymentTerms: null,
        taxId: null,
        branchName: null,
        email: null,
        noteText: null,
        sourceRowNumber: rowNumber
      }
      customers.push(current)
      if (codes.has(customerCode)) {
        errors.push({ rowNumber, field: 'customerCode', message: `รหัส ${customerCode} ซ้ำกับบรรทัด ${codes.get(customerCode)}` })
      } else {
        codes.set(customerCode, rowNumber)
      }
      return
    }

    if (!current) return
    const label5 = cleanText(row[5])
    const label8 = cleanText(row[8])
    const label11 = cleanText(row[11])

    if (label5 === 'ที่อยู่:') current.addressText = appendText(current.addressText, row[6])
    if (label5 === 'โทร. :') current.phoneText = cleanText(row[6])
    if (label5 === 'TAX ID:' || cleanText(row[6]) === 'TAX ID:') {
      const valueIndex = label5 === 'TAX ID:' ? 6 : 7
      current.taxId = cleanText(row[valueIndex])
      current.branchName = cleanText(row[valueIndex + 1])
    }
    if (label8 === 'ผู้ติดต่อ:') current.contactName = cleanText(row[9])
    if (label8 === 'เลขที่บ/ช:') {
      current.expressAccountCode = cleanText(row[9])
      current.addressText = appendText(current.addressText, row[6])
    }
    if (label8 === 'เครดิต:') {
      current.creditDays = parseCreditDays(row[9], rowNumber, errors)
      current.postalCode = cleanText(row[7])
    }
    if (label8 === 'เงื่อนไข:') current.paymentTerms = cleanText(row[9])
    if (label8 === 'E-mail:') current.email = cleanText(row[9])
    if (label11 === 'ขนส่งโดย:') current.shippingMethod = cleanText(row[12])
    if (label11 === 'วงเงิน:') current.creditLimit = parseCreditLimit(row[12], rowNumber, errors)

    const hasKnownLabel = [label5, label8, label11].some(Boolean)
    if (!hasKnownLabel && cleanText(row[6])) current.noteText = appendText(current.noteText, row[6])
  })

  if (customers.length === 0) {
    errors.push({ rowNumber: null, field: 'file', message: 'ไม่พบรายการ Customer ในรูปแบบรายงาน Express' })
  }
  return { customers, errors }
}
