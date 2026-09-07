import iconv from 'iconv-lite'
import { parse } from 'csv-parse/sync'

const DETAIL_FIELDS = {
  'ที่อยู่': 'addressText',
  'เบอร์โทรศัพท์': 'phoneText',
  'ชื่อผู้ติดต่อ': 'contactName',
  'เลขที่ประจำตัวผู้เสียภาษี': 'taxId',
  'E-mail': 'email',
  'สาขา': 'branchName'
}

function cleanText(value) {
  if (value === undefined || value === null) return null
  const cleaned = String(value).trim()
  return cleaned === '' ? null : cleaned
}

function parseOptionalNumber(value, field, rowNumber, errors, integer = false) {
  const cleaned = cleanText(value)
  if (cleaned === null) return null
  const number = Number(cleaned.replaceAll(',', ''))
  if (!Number.isFinite(number) || number < 0 || (integer && !Number.isInteger(number))) {
    errors.push({ rowNumber, field, message: `ค่า ${cleaned} ไม่ใช่ตัวเลขที่ถูกต้อง` })
    return null
  }
  return number
}

function isSupplierRow(row) {
  const code = cleanText(row[3])
  return code !== null && code !== 'รหัส'
}

export function parseExpressSuppliers(fileBuffer) {
  const rows = parse(iconv.decode(fileBuffer, 'windows-874'), {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: false
  })
  const suppliers = []
  const errors = []
  const codes = new Map()
  let supplierType = null
  let currentSupplier = null

  rows.forEach((row, index) => {
    const rowNumber = index + 1
    const typeLabel = cleanText(row[1])
    // Express drops the first Thai character in this report label ("ระเภท...").
    if (typeLabel?.includes('เภทผู้จำหน่าย')) {
      supplierType = cleanText(row[2])
      return
    }

    if (isSupplierRow(row)) {
      const supplierCode = cleanText(row[3])
      const supplierName = cleanText(row[4])
      currentSupplier = {
        supplierCode,
        supplierName,
        supplierType,
        creditDays: parseOptionalNumber(row[9], 'creditDays', rowNumber, errors, true),
        creditLimit: parseOptionalNumber(row[11], 'creditLimit', rowNumber, errors),
        expressAccountCode: cleanText(row[12]),
        addressText: null,
        phoneText: null,
        contactName: null,
        taxId: null,
        email: null,
        branchName: null,
        sourceRowNumber: rowNumber
      }
      suppliers.push(currentSupplier)

      if (!supplierName) errors.push({ rowNumber, field: 'supplierName', message: 'ชื่อ Supplier ห้ามว่าง' })
      if (codes.has(supplierCode)) {
        errors.push({ rowNumber, field: 'supplierCode', message: `รหัส ${supplierCode} ซ้ำกับบรรทัด ${codes.get(supplierCode)}` })
      } else {
        codes.set(supplierCode, rowNumber)
      }
      return
    }

    if (!currentSupplier) return
    for (const [columnIndex, valueIndex] of [[5, 6], [7, 8]]) {
      const field = DETAIL_FIELDS[cleanText(row[columnIndex])]
      if (field) currentSupplier[field] = cleanText(row[valueIndex])
    }
  })

  if (suppliers.length === 0) {
    errors.push({ rowNumber: null, field: 'file', message: 'ไม่พบรายการ Supplier ในรูปแบบรายงาน Express' })
  }
  return { suppliers, errors }
}
