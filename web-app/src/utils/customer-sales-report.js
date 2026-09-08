export function aggregateCustomerSales(rows) {
  const customers = new Map()

  rows.forEach((row) => {
    const current = customers.get(row.customerCode) || {
      customerCode: row.customerCode,
      customerName: row.customerName || row.customerCode,
      totalQuantity: 0,
      totalSales: 0,
      documentNumbers: new Set(),
      history: []
    }

    current.totalQuantity += Number(row.analysisQuantity || 0)
    current.totalSales += Number(row.analysisNetAmount || 0)
    current.documentNumbers.add(row.documentNumber)
    current.history.push(row)
    customers.set(row.customerCode, current)
  })

  return [...customers.values()].map((customer) => ({
    customerCode: customer.customerCode,
    customerName: customer.customerName,
    totalQuantity: customer.totalQuantity,
    totalSales: customer.totalSales,
    documentCount: customer.documentNumbers.size,
    transactionCount: customer.history.length,
    history: customer.history
  }))
}
