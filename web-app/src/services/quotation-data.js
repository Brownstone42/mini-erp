import { executeMutation, executeQuery, getDataConnect, mutationRef, queryRef } from 'firebase/data-connect'
import { firebaseApp } from './firebase.js'
import { nextQuotationNumber, quotationMonthPrefix } from '../utils/quotation.js'

const dataConnect = getDataConnect(firebaseApp, { connector: 'supplier-web', service: 'mini-erp-service', location: 'asia-southeast1' })
const serverOnly = { fetchPolicy: 'SERVER_ONLY' }

async function latestQuotationNumber(prefix) {
  const result = await executeQuery(queryRef(dataConnect, 'LatestQuotationForMonth', {
    rangeStart: `${prefix}0000`,
    rangeEnd: `${prefix}9999`
  }), serverOnly)
  return result.data?.quotations?.[0]?.quotationNumber || null
}

export async function previewNextQuotationNumber(quotationDate) {
  const prefix = quotationMonthPrefix(quotationDate)
  return nextQuotationNumber(prefix, await latestQuotationNumber(prefix))
}

export async function createQuotation(quotation) {
  const prefix = quotationMonthPrefix(quotation.quotationDate)
  const requestId = crypto.randomUUID()
  let lastError
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existingRequest = await executeQuery(queryRef(dataConnect, 'GetQuotationByRequestId', { requestId }), serverOnly)
    const existingNumber = existingRequest.data?.quotations?.[0]?.quotationNumber
    if (existingNumber) return existingNumber
    const quotationNumber = nextQuotationNumber(prefix, await latestQuotationNumber(prefix))
    const lines = quotation.lines.map((line, index) => ({
      quotationNumber,
      lineNumber: index + 1,
      productCode: line.productCode || null,
      description: line.description.trim(),
      unitText: line.unitText?.trim() || null,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      lineTotal: Number((Number(line.quantity) * Number(line.unitPrice)).toFixed(2))
    }))
    try {
      await executeMutation(mutationRef(dataConnect, 'CreateQuotation', {
        quotationNumber,
        requestId,
        quotationDate: quotation.quotationDate,
        customerCode: quotation.customerCode || null,
        customerName: quotation.customerName.trim(),
        addressText: quotation.addressText?.trim() || null,
        email: quotation.email?.trim() || null,
        phoneText: quotation.phoneText?.trim() || null,
        signatoryId: quotation.signatoryId || null,
        remarkText: quotation.remarkText.trim(),
        totalAmount: Number(quotation.totalAmount.toFixed(2)),
        lines
      }))
      return quotationNumber
    } catch (error) {
      lastError = error
      const recovered = await executeQuery(queryRef(dataConnect, 'GetQuotationByRequestId', { requestId }), serverOnly).catch(() => null)
      const recoveredNumber = recovered?.data?.quotations?.[0]?.quotationNumber
      if (recoveredNumber) return recoveredNumber
    }
  }
  throw lastError
}
