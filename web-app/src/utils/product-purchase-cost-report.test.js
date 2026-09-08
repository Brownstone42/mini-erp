import { describe, expect, it } from 'vitest'
import { aggregateProductPurchaseCosts } from './product-purchase-cost-report.js'

describe('aggregateProductPurchaseCosts', () => {
  it('separates suppliers and calculates a weighted average from the latest three purchase documents', () => {
    const base = { productCode: 'P01', productName: 'สินค้า A', isActive: true }
    const rows = [
      { ...base, supplierCode: 'S01', supplierName: 'เจ้า A', transactionDate: '2026-04-01', documentNumber: 'IV04', analysisQuantity: 5, analysisNetAmount: 600, isReturn: false },
      { ...base, supplierCode: 'S01', supplierName: 'เจ้า A', transactionDate: '2026-03-01', documentNumber: 'IV03', analysisQuantity: 10, analysisNetAmount: 1000, isReturn: false },
      { ...base, supplierCode: 'S01', supplierName: 'เจ้า A', transactionDate: '2026-02-01', documentNumber: 'IV02', analysisQuantity: 20, analysisNetAmount: 1800, isReturn: false },
      { ...base, supplierCode: 'S01', supplierName: 'เจ้า A', transactionDate: '2026-01-01', documentNumber: 'IV01', analysisQuantity: 10, analysisNetAmount: 800, isReturn: false },
      { ...base, supplierCode: 'S01', supplierName: 'เจ้า A', transactionDate: '2026-04-10', documentNumber: 'CN01', analysisQuantity: -1, analysisNetAmount: -120, isReturn: true },
      { ...base, supplierCode: 'S02', supplierName: 'เจ้า B', transactionDate: '2026-03-15', documentNumber: 'IV05', analysisQuantity: 2, analysisNetAmount: 260, isReturn: false }
    ]

    const result = aggregateProductPurchaseCosts(rows)
    const supplierA = result.find((item) => item.supplierCode === 'S01')

    expect(result).toHaveLength(2)
    expect(supplierA.latestUnitCost).toBe(120)
    expect(supplierA.averageThreeUnitCost).toBeCloseTo(3400 / 35)
    expect(supplierA.averageDocumentCount).toBe(3)
    expect(supplierA.returnDocumentCount).toBe(1)
  })

  it('combines duplicate lines in the same document before calculating cost', () => {
    const rows = [
      { productCode: 'P01', productName: 'สินค้า A', supplierCode: 'S01', supplierName: 'เจ้า A', transactionDate: '2026-04-01', documentNumber: 'IV01', analysisQuantity: 2, analysisNetAmount: 200, isReturn: false, isActive: true },
      { productCode: 'P01', productName: 'สินค้า A', supplierCode: 'S01', supplierName: 'เจ้า A', transactionDate: '2026-04-01', documentNumber: 'IV01', analysisQuantity: 3, analysisNetAmount: 330, isReturn: false, isActive: true }
    ]
    const [result] = aggregateProductPurchaseCosts(rows)
    expect(result.history).toHaveLength(1)
    expect(result.latestUnitCost).toBe(106)
  })

  it('keeps zero-net documents in history but excludes them from latest cost and averages', () => {
    const rows = [
      { productCode: 'P01', productName: 'สินค้า A', supplierCode: 'S01', supplierName: 'เจ้า A', transactionDate: '2026-04-01', documentNumber: 'IV02', analysisQuantity: 5, analysisNetAmount: 0, isReturn: false, isActive: true },
      { productCode: 'P01', productName: 'สินค้า A', supplierCode: 'S01', supplierName: 'เจ้า A', transactionDate: '2026-03-01', documentNumber: 'IV01', analysisQuantity: 5, analysisNetAmount: 500, isReturn: false, isActive: true }
    ]

    const [result] = aggregateProductPurchaseCosts(rows)
    expect(result.history).toHaveLength(2)
    expect(result.history[0].unitCost).toBeNull()
    expect(result.latestPurchaseDate).toBe('2026-03-01')
    expect(result.latestUnitCost).toBe(100)
    expect(result.averageThreeUnitCost).toBe(100)
    expect(result.averageDocumentCount).toBe(1)
  })
})
