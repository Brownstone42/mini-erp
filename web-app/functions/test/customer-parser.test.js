import assert from 'node:assert/strict'
import test from 'node:test'
import iconv from 'iconv-lite'
import { parseExpressCustomers } from '../src/customer-parser.js'

function encodeRows(rows) {
  const csv = rows.map((row) => row
    .map((value) => `"${String(value).replaceAll('"', '""')}"`)
    .join(','))
    .join('\r\n')
  return iconv.encode(csv, 'windows-874')
}

test('parses an Express customer block and joins address and notes', () => {
  const file = encodeRows([
    ['', 'ประเภท:', 'ลูกค้าประจำ'],
    ['', '', '', 'AR001', ' บริษัท ทดสอบ จำกัด ', '', '', '', '', 'HD 001', 'กท', '1'],
    ['', '', '', '', '', 'ที่อยู่:', '99 ถนนสุขุมวิท', '', 'ผู้ติดต่อ:', 'สมชาย'],
    ['', '', '', '', '', '', 'กรุงเทพมหานคร', '', 'เลขที่บ/ช:', '1120-01', '', 'ขนส่งโดย:', 'รถบริษัท'],
    ['', '', '', '', '', '', '', '10110', 'เครดิต:', '30 วัน', '', 'วงเงิน:', '1,000.00'],
    ['', '', '', '', '', 'โทร. :', '02-000-0000', '', 'เงื่อนไข:', 'n/30'],
    ['', '', '', '', '', 'TAX ID:', '0012345678901', 'สำนักงานใหญ่', 'E-mail:', 'test@example.com'],
    ['', '', '', '', '', '', 'หมายเหตุหนึ่ง'],
    ['', '', '', '', '', '', 'หมายเหตุสอง']
  ])
  const result = parseExpressCustomers(file)
  assert.equal(result.errors.length, 0)
  assert.equal(result.customers.length, 1)
  assert.equal(result.customers[0].addressText, '99 ถนนสุขุมวิท กรุงเทพมหานคร')
  assert.equal(result.customers[0].creditDays, 30)
  assert.equal(result.customers[0].creditLimit, 1000)
  assert.equal(result.customers[0].taxId, '0012345678901')
  assert.equal(result.customers[0].noteText, 'หมายเหตุหนึ่ง หมายเหตุสอง')
})

test('accepts an unescaped quote from the Express report', () => {
  const raw = '"","","","AR001","Customer","","","","ผู้ติดต่อ:","k.ปิ่นมณี k"ให"'
  const result = parseExpressCustomers(iconv.encode(raw, 'windows-874'))
  assert.equal(result.customers.length, 1)
})
