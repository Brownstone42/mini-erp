import assert from 'node:assert/strict'
import test from 'node:test'
import iconv from 'iconv-lite'
import { parseExpressSuppliers } from '../src/supplier-parser.js'

function encodeRows(rows) {
  return iconv.encode(rows.map((row) => row.join(',')).join('\r\n'), 'windows-874')
}

test('parses supplier details across an Express page header', () => {
  const file = encodeRows([
    ['', 'ประเภทผู้จำหน่าย :', 'ผู้จำหน่ายประจำ'],
    ['', '', '', 'AP001', ' บริษัท ทดสอบ จำกัด ', '', '', '', '', '30', '', '1250.50', '2111-00'],
    ['', '', '', '', '', 'ที่อยู่', ' กรุงเทพฯ '],
    ['', 'บริษัท ตัวอย่าง หน้า : 2'],
    ['', 'รายละเอียดผู้จำหน่าย/เจ้าหนี้'],
    ['', '', '', 'รหัส', 'คำนำหน้า+ชื่อผู้จำหน่าย'],
    ['', '', '', '', '', 'เบอร์โทรศัพท์', '02-000-0000', 'ชื่อผู้ติดต่อ', 'สมชาย'],
    ['', '', '', '', '', 'เลขที่ประจำตัวผู้เสียภาษี', '0012345678901', 'E-mail', 'test@example.com'],
    ['', '', '', '', '', 'สาขา', 'สำนักงานใหญ่']
  ])
  const result = parseExpressSuppliers(file)
  assert.equal(result.errors.length, 0)
  assert.equal(result.suppliers.length, 1)
  assert.equal(result.suppliers[0].supplierCode, 'AP001')
  assert.equal(result.suppliers[0].supplierName, 'บริษัท ทดสอบ จำกัด')
  assert.equal(result.suppliers[0].phoneText, '02-000-0000')
  assert.equal(result.suppliers[0].taxId, '0012345678901')
  assert.equal(result.suppliers[0].creditLimit, 1250.5)
})

test('reports duplicate supplier codes', () => {
  const file = encodeRows([
    ['', '', '', 'AP001', 'Supplier One'],
    ['', '', '', 'AP001', 'Supplier Two']
  ])
  const result = parseExpressSuppliers(file)
  assert.equal(result.errors.length, 1)
  assert.match(result.errors[0].message, /ซ้ำ/)
})
