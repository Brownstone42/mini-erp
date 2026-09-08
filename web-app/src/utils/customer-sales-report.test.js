import { describe, expect, it } from 'vitest'
import { aggregateCustomerSales } from './customer-sales-report.js'

describe('aggregateCustomerSales', () => {
  it('combines sales and returns by customer and counts unique documents', () => {
    const rows = [
      { customerCode: 'AR001', customerName: 'ลูกค้า A', documentNumber: 'IV001', analysisQuantity: 10, analysisNetAmount: 1000 },
      { customerCode: 'AR001', customerName: 'ลูกค้า A', documentNumber: 'IV001', analysisQuantity: 5, analysisNetAmount: 500 },
      { customerCode: 'AR001', customerName: 'ลูกค้า A', documentNumber: 'CN001', analysisQuantity: -2, analysisNetAmount: -200 },
      { customerCode: 'AR002', customerName: 'ลูกค้า B', documentNumber: 'IV002', analysisQuantity: 1, analysisNetAmount: 75 }
    ]

    const result = aggregateCustomerSales(rows)
    const customer = result.find((row) => row.customerCode === 'AR001')

    expect(result).toHaveLength(2)
    expect(customer.totalQuantity).toBe(13)
    expect(customer.totalSales).toBe(1300)
    expect(customer.documentCount).toBe(2)
    expect(customer.transactionCount).toBe(3)
    expect(customer.history).toHaveLength(3)
  })
})
