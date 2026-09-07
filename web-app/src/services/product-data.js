import { executeQuery, getDataConnect, queryRef } from 'firebase/data-connect'
import { firebaseApp } from './firebase.js'

const productDataConnect = getDataConnect(firebaseApp, {
  connector: 'supplier-web',
  service: 'mini-erp-service',
  location: 'asia-southeast1'
})

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function mapProduct(product) {
  if (!product) return null
  return {
    ...product,
    categoryCode: product.category?.categoryCode,
    categoryName: product.category?.categoryName,
    supplierCode: product.supplier?.supplierCode,
    supplierName: product.supplier?.supplierName,
    status: product.isActive ? 'ACTIVE' : 'INACTIVE',
    updatedAtRaw: product.updatedAt,
    createdAt: formatDateTime(product.createdAt),
    updatedAt: formatDateTime(product.updatedAt)
  }
}

function mapCategory(category) {
  if (!category) return null
  return {
    ...category,
    status: category.isActive ? 'ACTIVE' : 'INACTIVE',
    updatedAtRaw: category.updatedAt,
    createdAt: formatDateTime(category.createdAt),
    updatedAt: formatDateTime(category.updatedAt)
  }
}

export async function fetchProducts() {
  const result = await executeQuery(queryRef(productDataConnect, 'ListProducts', { limit: 2000, offset: 0 }))
  return (result.data?.products || []).map(mapProduct)
}

export async function fetchProduct(productCode) {
  const result = await executeQuery(queryRef(productDataConnect, 'GetProduct', { productCode }))
  return mapProduct(result.data?.product)
}

export async function fetchProductCategories() {
  const result = await executeQuery(queryRef(productDataConnect, 'ListProductCategories', { limit: 100, offset: 0 }))
  return (result.data?.productCategories || []).map(mapCategory)
}

export async function fetchProductCategory(categoryCode) {
  const [categoryResult, products] = await Promise.all([
    executeQuery(queryRef(productDataConnect, 'GetProductCategory', { categoryCode })),
    fetchProducts()
  ])
  const category = mapCategory(categoryResult.data?.productCategory)
  if (!category) return null
  return { ...category, products: products.filter((product) => product.categoryCode === categoryCode) }
}
