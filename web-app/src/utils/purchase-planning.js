export function planningPeriod(today = new Date()) {
  const year = today.getFullYear()
  const month = today.getMonth()
  const start = new Date(year, month - 11, 1)
  const end = new Date(year, month + 1, 0)
  const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return { start: iso(start), end: iso(end), currentMonth: `${year}-${String(month + 1).padStart(2, '0')}` }
}

export function normalizeUnitText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ') || 'ไม่ระบุหน่วย'
}

export function createUnitResolver(mappings = []) {
  const aliases = new Map(mappings.map((item) => [
    normalizeUnitText(item.sourceUnitText).toLocaleLowerCase('th-TH'),
    normalizeUnitText(item.standardUnitText)
  ]))
  return (value) => {
    const unit = normalizeUnitText(value)
    return aliases.get(unit.toLocaleLowerCase('th-TH')) || unit
  }
}

export function createQuantityConverter({ resolveUnit = normalizeUnitText, productConversions = [], universalConversions = [] } = {}) {
  const key = (value) => normalizeUnitText(value).toLocaleLowerCase('th-TH')
  const productRules = new Map(productConversions.map((item) => [
    `${item.productCode}|${key(resolveUnit(item.sourceUnitText))}`,
    { unit: resolveUnit(item.baseUnitText), factor: Number(item.baseQuantityPerSourceUnit) }
  ]))
  const universalRules = new Map(universalConversions.map((item) => [
    key(resolveUnit(item.sourceUnitText)),
    { unit: resolveUnit(item.baseUnitText), factor: Number(item.baseQuantityPerSourceUnit) }
  ]))

  return (row, quantity, unitText) => {
    const unit = resolveUnit(unitText)
    const rule = productRules.get(`${row.productCode}|${key(unit)}`) || universalRules.get(key(unit))
    if (!rule || !Number.isFinite(rule.factor) || rule.factor <= 0) return { unit, quantity }
    return { unit: rule.unit, quantity: quantity * rule.factor }
  }
}

export function amountsByUnit(rows, quantityField, unitField = 'sourceUnitText', resolveUnit = normalizeUnitText, convertQuantity = null) {
  const totals = new Map()
  for (const row of rows) {
    const rawQuantity = Number(row[quantityField] || 0)
    const converted = convertQuantity ? convertQuantity(row, rawQuantity, row[unitField]) : { unit: resolveUnit(row[unitField]), quantity: rawQuantity }
    totals.set(converted.unit, (totals.get(converted.unit) || 0) + converted.quantity)
  }
  return [...totals].map(([unit, quantity]) => ({ unit, quantity })).sort((a, b) => a.unit.localeCompare(b.unit, 'th'))
}

export function salesForProduct(rows, productCode, start, end) {
  return rows.filter((row) => row.isActive !== false && row.productCode === productCode && row.transactionDate >= start && row.transactionDate <= end)
}

export function monthlyCompanySales(rows, resolveUnit = normalizeUnitText, convertQuantity = null) {
  const groups = new Map()
  for (const row of rows) {
    const month = row.transactionDate.slice(0, 7)
    const rawQuantity = Number(row.sourceQuantity || 0)
    const converted = convertQuantity ? convertQuantity(row, rawQuantity, row.sourceUnitText) : { unit: resolveUnit(row.sourceUnitText), quantity: rawQuantity }
    const unit = converted.unit
    const key = [month, row.customerCode || '', unit].join('|')
    if (!groups.has(key)) groups.set(key, {
      month, customerCode: row.customerCode || '', customerName: row.customerName || 'ไม่ระบุบริษัท',
      unit, sold: 0, returned: 0
    })
    const group = groups.get(key)
    if (row.isReturn) group.returned += converted.quantity
    else group.sold += converted.quantity
  }
  return [...groups.values()].sort((a, b) => b.month.localeCompare(a.month) || a.customerName.localeCompare(b.customerName, 'th'))
}

export function pendingForProduct(rows, productCode) {
  return rows.filter((row) => row.productCode === productCode)
}
