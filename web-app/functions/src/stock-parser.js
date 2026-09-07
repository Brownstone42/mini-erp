import { createHash } from 'node:crypto'
import iconv from 'iconv-lite'
import { parse } from 'csv-parse/sync'

const PRODUCT_CODE = /^[A-Z0-9]+(?:-[A-Z0-9]+){4}$/i
const PRODUCT_LINE = /^"","([A-Z0-9]+(?:-[A-Z0-9]+){4})","(.*)"(?:,"?"){7},(-?[\d,.]+),"([^"]*)",(-?[\d,.]*),"",(-?[\d,.]+)\s*$/i

function clean(value) {
  if (value === undefined || value === null) return null
  const result = String(value).replaceAll('\u00a0', ' ').trim()
  return result || null
}

function number(value, field, rowNumber, errors, required = true) {
  const valueText = clean(value)
  if (!valueText) {
    if (required) errors.push({ rowNumber, field, message: `ไม่พบค่า ${field}` })
    return null
  }
  const result = Number(valueText.replaceAll(',', ''))
  if (!Number.isFinite(result)) errors.push({ rowNumber, field, message: `ค่า ${valueText} ไม่ใช่ตัวเลขที่ถูกต้อง` })
  return Number.isFinite(result) ? result : null
}

function buddhistDate(value, field, rowNumber, errors) {
  const match = clean(value)?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) {
    errors.push({ rowNumber, field, message: `วันที่ ${value || '-'} ไม่ถูกต้อง` })
    return null
  }
  const year = Number(match[3]) - 543
  const date = new Date(Date.UTC(year, Number(match[2]) - 1, Number(match[1])))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[1])) {
    errors.push({ rowNumber, field, message: `วันที่ ${value} ไม่ถูกต้อง` })
    return null
  }
  return `${year}-${match[2]}-${match[1]}`
}

function parseColumns(line) {
  try { return parse(line, { relax_quotes: true, relax_column_count: true })[0] || [] } catch { return [] }
}

export function parseExpressStock(fileBuffer) {
  const lines = iconv.decode(fileBuffer, 'windows-874').split(/\r?\n/)
  const errors = []
  const warnings = []
  const rawProducts = []
  const rawLots = []
  const productCodes = new Map()
  const lotOccurrences = new Map()
  const mismatchCodes = new Set()
  let snapshotDate = null
  let warehouseFrom = null
  let warehouseTo = null
  let currentProduct = null
  let reportControl = null

  lines.forEach((line, index) => {
    const rowNumber = index + 1
    const normalizedLine = line.replaceAll('\u00a0', ' ')
    const dateMatch = normalizedLine.match(/วันที่\s*:\s*(\d{2}\/\d{2}\/\d{4})/)
    if (dateMatch && !snapshotDate) snapshotDate = buddhistDate(dateMatch[1], 'snapshotDate', rowNumber, errors)
    const warehouseMatch = normalizedLine.match(/คลังสินค้าจาก\s+(\S+)\s+ถึง\s+(\S+)/)
    if (warehouseMatch && !warehouseFrom) {
      warehouseFrom = clean(warehouseMatch[1])
      warehouseTo = clean(warehouseMatch[2])
    }

    const productPrefix = line.match(/^"","([^"]+)","/)
    if (PRODUCT_CODE.test(clean(productPrefix?.[1]) || '')) {
      const match = line.match(PRODUCT_LINE)
      if (!match) {
        errors.push({ rowNumber, field: 'file', message: `ไม่สามารถอ่านโครงสร้างสินค้า ${clean(productPrefix?.[1])}` })
        currentProduct = null
        return
      }
      const productCode = clean(match[1])
      if (productCodes.has(productCode)) errors.push({ rowNumber, field: 'productCode', message: `รหัส ${productCode} ซ้ำกับบรรทัด ${productCodes.get(productCode)}` })
      else productCodes.set(productCode, rowNumber)
      currentProduct = {
        sourceRowNumber: rowNumber,
        productCode,
        productName: clean(match[2]?.replaceAll('""', '"')),
        quantity: number(match[3], 'quantity', rowNumber, errors),
        sourceUnitText: clean(match[4]),
        unitCost: number(match[5], 'unitCost', rowNumber, errors, false),
        inventoryValue: number(match[6], 'inventoryValue', rowNumber, errors),
        lotMismatch: false
      }
      rawProducts.push(currentProduct)
      return
    }

    if (line.includes('รวมล๊อตคงเหลือ') && line.includes('ยอดรวมล๊อตไม่เท่ากับยอดคงเหลือ') && currentProduct) {
      currentProduct.lotMismatch = true
      mismatchCodes.add(currentProduct.productCode)
      return
    }

    const columns = parseColumns(line)
    const receivedDateText = clean(columns[5])
    if (currentProduct && /^\d{2}\/\d{2}\/\d{4}$/.test(receivedDateText || '') && clean(columns[6])) {
      const receivedDate = buddhistDate(receivedDateText, 'receivedDate', rowNumber, errors)
      const lotReference = clean(columns[6])
      const identity = [currentProduct.productCode, receivedDate, lotReference, clean(columns[7]), clean(columns[8]), clean(columns[9])].join('|')
      const sourceOccurrence = (lotOccurrences.get(identity) || 0) + 1
      lotOccurrences.set(identity, sourceOccurrence)
      rawLots.push({
        sourceRowNumber: rowNumber,
        productCode: currentProduct.productCode,
        sourceOccurrence,
        receivedDate,
        lotReference,
        quantity: number(columns[7], 'lotQuantity', rowNumber, errors),
        unitCost: number(columns[8], 'lotUnitCost', rowNumber, errors, false),
        inventoryValue: number(columns[9], 'lotInventoryValue', rowNumber, errors, false)
      })
    }

    if (clean(columns[1]) === 'รวมทั้งสิ้น') {
      reportControl = {
        productCount: number(columns[2], 'reportProductCount', rowNumber, errors),
        totalQuantity: number(columns[10], 'reportTotalQuantity', rowNumber, errors),
        totalInventoryValue: number(columns[14], 'reportTotalInventoryValue', rowNumber, errors)
      }
    }
  })

  if (!snapshotDate) errors.push({ rowNumber: null, field: 'snapshotDate', message: 'ไม่พบวันที่ Snapshot ในหัวรายงาน Express' })
  if (!warehouseFrom || !warehouseTo) errors.push({ rowNumber: null, field: 'warehouse', message: 'ไม่พบช่วงคลังสินค้าในหัวรายงาน Express' })
  if (!rawProducts.length) errors.push({ rowNumber: null, field: 'file', message: 'ไม่พบรายการสินค้าคงเหลือในรายงาน Express' })

  const totalQuantity = rawProducts.reduce((total, row) => total + (row.quantity || 0), 0)
  const totalInventoryValue = rawProducts.reduce((total, row) => total + (row.inventoryValue || 0), 0)
  if (reportControl) {
    if (reportControl.productCount !== rawProducts.length) errors.push({ rowNumber: null, field: 'controlTotal', message: `จำนวนสินค้าไม่ตรงกับยอดรวมท้ายรายงาน (${rawProducts.length}/${reportControl.productCount})` })
    if (Math.abs(totalQuantity - reportControl.totalQuantity) > 0.0001) errors.push({ rowNumber: null, field: 'controlTotal', message: 'จำนวนคงเหลือรวมไม่ตรงกับยอดรวมท้ายรายงาน' })
    if (Math.abs(totalInventoryValue - reportControl.totalInventoryValue) > 0.01) errors.push({ rowNumber: null, field: 'controlTotal', message: 'มูลค่าคงเหลือรวมไม่ตรงกับยอดรวมท้ายรายงาน' })
  } else errors.push({ rowNumber: null, field: 'controlTotal', message: 'ไม่พบยอดรวมท้ายรายงาน Express' })

  mismatchCodes.forEach((productCode) => warnings.push({ productCode, message: 'ยอดรวม Lot ไม่เท่ากับยอดคงเหลือตามที่ Express แจ้งเตือน' }))
  const scope = `${snapshotDate}|${warehouseFrom}|${warehouseTo}`
  const rows = rawProducts.map((row) => ({ ...row, sourceKey: createHash('sha256').update(`${scope}|${row.productCode}`).digest('hex'), snapshotDate, warehouseFrom, warehouseTo }))
  const snapshotKeyByProduct = new Map(rows.map((row) => [row.productCode, row.sourceKey]))
  const lots = rawLots.map((lot) => {
    const snapshotKey = snapshotKeyByProduct.get(lot.productCode)
    const identity = [snapshotKey, lot.receivedDate, lot.lotReference, lot.quantity, lot.unitCost, lot.inventoryValue, lot.sourceOccurrence].join('|')
    return { ...lot, sourceKey: createHash('sha256').update(identity).digest('hex'), snapshotKey, snapshotDate, warehouseFrom, warehouseTo }
  })
  return { snapshotDate, warehouseFrom, warehouseTo, rows, lots, warnings, errors, reportControl }
}
