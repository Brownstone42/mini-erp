function number(value) {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

export function aggregateProductSalesPrices(rows) {
  const documents = new Map()

  rows.filter((row) => row.isActive !== false).forEach((row) => {
    const key = [row.productCode, row.customerCode, row.transactionDate, row.documentNumber].join('\u0000')
    const current = documents.get(key) || {
      productCode: row.productCode,
      productName: row.productName || row.productCode,
      customerCode: row.customerCode,
      customerName: row.customerName || row.customerCode,
      transactionDate: row.transactionDate,
      documentNumber: row.documentNumber,
      isReturn: Boolean(row.isReturn),
      analysisQuantity: 0,
      analysisNetAmount: 0,
      hasAnalysisNetAmount: false,
      sourceUnits: new Set(),
      referenceText: row.referenceText || ''
    }
    current.analysisQuantity += number(row.analysisQuantity)
    current.analysisNetAmount += number(row.analysisNetAmount)
    if (row.analysisNetAmount != null && row.analysisNetAmount !== '') current.hasAnalysisNetAmount = true
    if (row.sourceUnitText) current.sourceUnits.add(row.sourceUnitText)
    documents.set(key, current)
  })

  const productCustomers = new Map()
  documents.forEach((document) => {
    document.sourceUnitText = [...document.sourceUnits].join(', ')
    document.unitPrice = !document.isReturn && document.hasAnalysisNetAmount
      && document.analysisQuantity > 0 && document.analysisNetAmount > 0
      ? document.analysisNetAmount / document.analysisQuantity
      : null
    delete document.sourceUnits

    const key = `${document.productCode}\u0000${document.customerCode}`
    const current = productCustomers.get(key) || {
      rowKey: key,
      productCode: document.productCode,
      productName: document.productName,
      customerCode: document.customerCode,
      customerName: document.customerName,
      history: []
    }
    current.history.push(document)
    productCustomers.set(key, current)
  })

  const customerGroups = [...productCustomers.values()].map((group) => {
    group.history.sort((left, right) => right.transactionDate.localeCompare(left.transactionDate)
      || right.documentNumber.localeCompare(left.documentNumber))
    const sales = group.history.filter((item) => item.unitPrice != null)
    const latestThree = sales.slice(0, 3)
    const quantity = latestThree.reduce((total, item) => total + item.analysisQuantity, 0)
    const amount = latestThree.reduce((total, item) => total + item.analysisNetAmount, 0)
    return {
      ...group,
      latestSaleDate: sales[0]?.transactionDate || '',
      latestUnitPrice: sales[0]?.unitPrice ?? null,
      averageThreeUnitPrice: quantity > 0 ? amount / quantity : null,
      averageDocumentCount: latestThree.length,
      saleDocumentCount: sales.length,
      returnDocumentCount: group.history.filter((item) => item.isReturn).length
    }
  })

  const products = new Map()
  customerGroups.forEach((customer) => {
    const current = products.get(customer.productCode) || {
      productCode: customer.productCode,
      productName: customer.productName,
      customers: []
    }
    current.customers.push(customer)
    products.set(customer.productCode, current)
  })

  return [...products.values()].map((product) => {
    product.customers.sort((left, right) => right.latestSaleDate.localeCompare(left.latestSaleDate)
      || left.customerCode.localeCompare(right.customerCode))
    return {
      ...product,
      customerCount: product.customers.length,
      documentCount: product.customers.reduce((total, item) => total + item.history.length, 0),
      latestSaleDate: product.customers.reduce((date, item) => !date || item.latestSaleDate > date ? item.latestSaleDate : date, '')
    }
  })
}
