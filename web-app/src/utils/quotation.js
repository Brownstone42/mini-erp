const THAI_DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
const THAI_POSITIONS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']

function readThaiSection(value) {
  const digits = String(Math.trunc(value)).padStart(6, '0').split('').map(Number)
  return digits.map((digit, index) => {
    if (!digit) return ''
    const position = 5 - index
    if (position === 1 && digit === 1) return 'สิบ'
    if (position === 1 && digit === 2) return 'ยี่สิบ'
    if (position === 0 && digit === 1 && digits.slice(0, 5).some(Boolean)) return 'เอ็ด'
    return `${THAI_DIGITS[digit]}${THAI_POSITIONS[position]}`
  }).join('')
}

function readThaiInteger(value) {
  const integer = Math.trunc(value)
  if (integer === 0) return THAI_DIGITS[0]
  const sections = []
  let remaining = integer
  while (remaining > 0) {
    sections.unshift(remaining % 1_000_000)
    remaining = Math.floor(remaining / 1_000_000)
  }
  return sections.map((section, index) => {
    if (!section) return ''
    const millionDepth = sections.length - index - 1
    return `${readThaiSection(section)}${'ล้าน'.repeat(millionDepth)}`
  }).join('')
}

export function thaiBahtText(value) {
  const amount = Math.round((Number(value) || 0) * 100)
  const baht = Math.floor(amount / 100)
  const satang = amount % 100
  return `${readThaiInteger(baht)}บาท${satang ? `${readThaiInteger(satang)}สตางค์` : 'ถ้วน'}`
}

export function quotationMonthPrefix(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(`${dateValue}T00:00:00`)
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function nextQuotationNumber(prefix, latestNumber) {
  const latestRunning = latestNumber?.startsWith(prefix) ? Number(latestNumber.slice(6)) : 0
  return `${prefix}${String(latestRunning + 1).padStart(4, '0')}`
}

export function quotationTotal(lines) {
  return lines.reduce((total, line) => total + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0)
}
