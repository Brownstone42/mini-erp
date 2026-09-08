function number(value) {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

export function aggregateProductPurchaseCosts(rows) {
  const documents = new Map()

  rows.filter((row) => row.isActive !== false).forEach((row) => {
    const key = [row.productCode, row.supplierCode, row.transactionDate, row.documentNumber].join('\u0000')
    const current = documents.get(key) || {
      productCode: row.productCode,
      productName: row.productName || row.productCode,
      supplierCode: row.supplierCode,
      supplierName: row.supplierName || row.supplierCode,
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

  const groups = new Map()
  documents.forEach((document) => {
    document.sourceUnitText = [...document.sourceUnits].join(', ')
    document.unitCost = !document.isReturn && document.hasAnalysisNetAmount
      && document.analysisQuantity > 0 && document.analysisNetAmount > 0
      ? document.analysisNetAmount / document.analysisQuantity
      : null
    delete document.sourceUnits

    const key = `${document.productCode}\u0000${document.supplierCode}`
    const current = groups.get(key) || {
      rowKey: key,
      productCode: document.productCode,
      productName: document.productName,
      supplierCode: document.supplierCode,
      supplierName: document.supplierName,
      history: []
    }
    current.history.push(document)
    groups.set(key, current)
  })

  return [...groups.values()].map((group) => {
    group.history.sort((left, right) => right.transactionDate.localeCompare(left.transactionDate)
      || right.documentNumber.localeCompare(left.documentNumber))
    const purchases = group.history.filter((item) => item.unitCost != null)
    const latestThree = purchases.slice(0, 3)
    const latestThreeQuantity = latestThree.reduce((total, item) => total + item.analysisQuantity, 0)
    const latestThreeAmount = latestThree.reduce((total, item) => total + item.analysisNetAmount, 0)
    return {
      ...group,
      latestPurchaseDate: purchases[0]?.transactionDate || '',
      latestUnitCost: purchases[0]?.unitCost ?? null,
      averageThreeUnitCost: latestThreeQuantity > 0 ? latestThreeAmount / latestThreeQuantity : null,
      averageDocumentCount: latestThree.length,
      purchaseDocumentCount: purchases.length,
      returnDocumentCount: group.history.filter((item) => item.isReturn).length
    }
  })
}
