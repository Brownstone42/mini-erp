import { describe, expect, it } from 'vitest'
import { aggregateProductSalesPrices } from './product-sales-price-report.js'

describe('aggregateProductSalesPrices', () => {
  it('groups a product by customer and calculates each customer price separately', () => {
    const base = { productCode: 'P01', productName: 'สินค้า A', isActive: true, isReturn: false }
    const rows = [
      { ...base, customerCode: 'C01', customerName: 'บริษัท A', transactionDate: '2026-03-01', documentNumber: 'IV03', analysisQuantity: 5, analysisNetAmount: 600 },
      { ...base, customerCode: 'C01', customerName: 'บริษัท A', transactionDate: '2026-02-01', documentNumber: 'IV02', analysisQuantity: 10, analysisNetAmount: 1000 },
      { ...base, customerCode: 'C01', customerName: 'บริษัท A', transactionDate: '2026-01-01', documentNumber: 'IV01', analysisQuantity: 20, analysisNetAmount: 1800 },
      { ...base, customerCode: 'C01', customerName: 'บริษัท A', transactionDate: '2025-12-01', documentNumber: 'IV00', analysisQuantity: 10, analysisNetAmount: 800 },
      { ...base, customerCode: 'C02', customerName: 'บริษัท B', transactionDate: '2026-03-02', documentNumber: 'IV04', analysisQuantity: 2, analysisNetAmount: 300 }
    ]

    const [product] = aggregateProductSalesPrices(rows)
    const customerA = product.customers.find((item) => item.customerCode === 'C01')
    expect(product.customerCount).toBe(2)
    expect(customerA.latestUnitPrice).toBe(120)
    expect(customerA.averageThreeUnitPrice).toBeCloseTo(3400 / 35)
    expect(customerA.averageDocumentCount).toBe(3)
  })

  it('shows returns and zero-net documents in history without using them for price', () => {
    const base = { productCode: 'P01', productName: 'สินค้า A', customerCode: 'C01', customerName: 'บริษัท A', isActive: true }
    const rows = [
      { ...base, transactionDate: '2026-03-03', documentNumber: 'CN01', analysisQuantity: -1, analysisNetAmount: -100, isReturn: true },
      { ...base, transactionDate: '2026-03-02', documentNumber: 'IV02', analysisQuantity: 2, analysisNetAmount: 0, isReturn: false },
      { ...base, transactionDate: '2026-03-01', documentNumber: 'IV01', analysisQuantity: 2, analysisNetAmount: 200, isReturn: false }
    ]
    const [product] = aggregateProductSalesPrices(rows)
    const [customer] = product.customers
    expect(customer.history).toHaveLength(3)
    expect(customer.latestSaleDate).toBe('2026-03-01')
    expect(customer.latestUnitPrice).toBe(100)
    expect(customer.averageDocumentCount).toBe(1)
  })
})
