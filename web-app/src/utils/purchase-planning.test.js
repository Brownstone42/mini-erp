import { expect, it } from 'vitest'
import { amountsByUnit, createQuantityConverter, createUnitResolver, monthlyCompanySales, planningPeriod, salesForProduct } from './purchase-planning.js'

it('12-month planning period includes current partial month', () => {
  expect(planningPeriod(new Date(2026, 8, 18))).toEqual({
    start: '2025-10-01', end: '2026-09-30', currentMonth: '2026-09'
  })
})

it('quantities in different units remain separate', () => {
  expect(amountsByUnit([
    { sourceUnitText: 'กล', pendingQuantity: 2 },
    { sourceUnitText: 'คู', pendingQuantity: 10 },
    { sourceUnitText: 'กล', pendingQuantity: 3 }
  ], 'pendingQuantity')).toEqual([
    { unit: 'กล', quantity: 5 },
    { unit: 'คู', quantity: 10 }
  ])
})

it('unit aliases combine without changing quantities', () => {
  const resolveUnit = createUnitResolver([{ sourceUnitText: 'กล.', standardUnitText: 'กล่อง' }])
  expect(amountsByUnit([
    { sourceUnitText: 'กล.', quantity: 2 },
    { sourceUnitText: 'กล่อง', quantity: 3 }
  ], 'quantity', 'sourceUnitText', resolveUnit)).toEqual([{ unit: 'กล่อง', quantity: 5 }])
})

it('product conversion changes sales units into the stock base unit', () => {
  const resolveUnit = createUnitResolver([{ sourceUnitText: 'ชน', standardUnitText: 'ชิ้น' }])
  const convertQuantity = createQuantityConverter({
    resolveUnit,
    productConversions: [
      { productCode: 'P1', sourceUnitText: 'กล่อง', baseUnitText: 'ชิ้น', baseQuantityPerSourceUnit: 1000 },
      { productCode: 'P1', sourceUnitText: 'ห่อ', baseUnitText: 'ชิ้น', baseQuantityPerSourceUnit: 50 }
    ]
  })
  expect(amountsByUnit([
    { productCode: 'P1', sourceUnitText: 'กล่อง', quantity: 2 },
    { productCode: 'P1', sourceUnitText: 'ห่อ', quantity: 3 },
    { productCode: 'P1', sourceUnitText: 'ชน', quantity: 10 }
  ], 'quantity', 'sourceUnitText', resolveUnit, convertQuantity)).toEqual([{ unit: 'ชิ้น', quantity: 2160 }])
})

it('universal yard conversion is applied to every product', () => {
  const convertQuantity = createQuantityConverter({
    universalConversions: [{ sourceUnitText: 'หลา', baseUnitText: 'เมตร', baseQuantityPerSourceUnit: 0.9 }]
  })
  expect(amountsByUnit([
    { productCode: 'P1', sourceUnitText: 'หลา', quantity: 10 },
    { productCode: 'P1', sourceUnitText: 'เมตร', quantity: 2 }
  ], 'quantity', 'sourceUnitText', undefined, convertQuantity)).toEqual([{ unit: 'เมตร', quantity: 11 }])
})

it('sales and returns stay separate by customer, month, and unit', () => {
  const rows = [
    { productCode: 'P1', transactionDate: '2026-09-01', customerCode: 'C1', customerName: 'Company 1', sourceUnitText: 'กล', sourceQuantity: 8, isReturn: false, isActive: true },
    { productCode: 'P1', transactionDate: '2026-09-02', customerCode: 'C1', customerName: 'Company 1', sourceUnitText: 'กล', sourceQuantity: 2, isReturn: true, isActive: true },
    { productCode: 'P1', transactionDate: '2026-09-03', customerCode: 'C1', customerName: 'Company 1', sourceUnitText: 'คู', sourceQuantity: 4, isReturn: false, isActive: true },
    { productCode: 'P1', transactionDate: '2026-09-04', customerCode: 'C2', customerName: 'Company 2', sourceUnitText: 'กล', sourceQuantity: 1, isReturn: false, isActive: false },
    { productCode: 'P2', transactionDate: '2026-09-04', customerCode: 'C1', customerName: 'Company 1', sourceUnitText: 'กล', sourceQuantity: 5, isReturn: false, isActive: true }
  ]
  const result = monthlyCompanySales(salesForProduct(rows, 'P1', '2026-09-01', '2026-09-30'))
  expect(result).toHaveLength(2)
  expect(result.find((row) => row.unit === 'กล')).toEqual({
    month: '2026-09', customerCode: 'C1', customerName: 'Company 1', unit: 'กล', sold: 8, returned: 2
  })
})
