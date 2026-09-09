import { describe, expect, it } from 'vitest'
import { nextQuotationNumber, quotationMonthPrefix, quotationTotal, thaiBahtText } from './quotation.js'

describe('quotation utilities', () => {
  it('creates a Gregorian year-month running number', () => {
    expect(quotationMonthPrefix('2027-01-08')).toBe('202701')
    expect(nextQuotationNumber('202701', '2027010009')).toBe('2027010010')
    expect(nextQuotationNumber('202701', null)).toBe('2027010001')
  })

  it('calculates VAT-inclusive totals without adding VAT again', () => {
    expect(quotationTotal([{ quantity: 2, unitPrice: 107 }, { quantity: 1, unitPrice: 53.5 }])).toBe(267.5)
  })

  it('writes Thai baht text', () => {
    expect(thaiBahtText(4183)).toBe('สี่พันหนึ่งร้อยแปดสิบสามบาทถ้วน')
    expect(thaiBahtText(100.25)).toBe('หนึ่งร้อยบาทยี่สิบห้าสตางค์')
  })
})
