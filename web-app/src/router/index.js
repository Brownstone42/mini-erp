import { createRouter, createWebHistory } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { firebaseAuth } from '../services/firebase.js'

const AppLayout = () => import('../layouts/AppLayout.vue')
const LoginView = () => import('../views/auth/LoginView.vue')
const DashboardView = () => import('../views/DashboardView.vue')
const SupplierListView = () => import('../views/master-data/suppliers/SupplierListView.vue')
const SupplierDetailView = () => import('../views/master-data/suppliers/SupplierDetailView.vue')
const SupplierImportView = () => import('../views/master-data/suppliers/SupplierImportView.vue')
const CustomerImportView = () => import('../views/master-data/customers/CustomerImportView.vue')
const CustomerListView = () => import('../views/master-data/customers/CustomerListView.vue')
const CustomerDetailView = () => import('../views/master-data/customers/CustomerDetailView.vue')
const ProductImportView = () => import('../views/master-data/products/ProductImportView.vue')
const ProductListView = () => import('../views/master-data/products/ProductListView.vue')
const ProductDetailView = () => import('../views/master-data/products/ProductDetailView.vue')
const ProductCategoryListView = () => import('../views/master-data/product-categories/ProductCategoryListView.vue')
const ProductCategoryDetailView = () => import('../views/master-data/product-categories/ProductCategoryDetailView.vue')
const SalesHistoryListView = () => import('../views/sales/SalesHistoryListView.vue')
const PurchaseHistoryListView = () => import('../views/purchases/PurchaseHistoryListView.vue')
const StockListView = () => import('../views/stock/StockListView.vue')
const SalesReportView = () => import('../views/reports/SalesReportView.vue')
const CustomerSalesReportView = () => import('../views/reports/CustomerSalesReportView.vue')
const ProductGroupListView = () => import('../views/settings/ProductGroupListView.vue')
const ProductGroupDetailView = () => import('../views/settings/ProductGroupDetailView.vue')

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'dashboard',
        component: DashboardView
      },
      {
        path: 'master-data/suppliers',
        name: 'supplier-list',
        component: SupplierListView
      },
      {
        path: 'master-data/suppliers/import',
        name: 'supplier-import',
        component: SupplierImportView
      },
      {
        path: 'master-data/suppliers/:supplierCode',
        name: 'supplier-detail',
        component: SupplierDetailView,
        props: true
      },
      {
        path: 'master-data/customers',
        name: 'customer-list',
        component: CustomerListView
      },
      {
        path: 'master-data/customers/import',
        name: 'customer-import',
        component: CustomerImportView
      },
      {
        path: 'master-data/customers/:customerCode',
        name: 'customer-detail',
        component: CustomerDetailView,
        props: true
      },
      {
        path: 'master-data/products',
        name: 'product-list',
        component: ProductListView
      },
      {
        path: 'master-data/products/import',
        name: 'product-import',
        component: ProductImportView
      },
      {
        path: 'master-data/products/:productCode',
        name: 'product-detail',
        component: ProductDetailView,
        props: true
      },
      {
        path: 'master-data/product-categories',
        name: 'product-category-list',
        component: ProductCategoryListView
      },
      {
        path: 'master-data/product-categories/:categoryCode',
        name: 'product-category-detail',
        component: ProductCategoryDetailView,
        props: true
      },
      {
        path: 'sales/history',
        name: 'sales-history-list',
        component: SalesHistoryListView
      },
      {
        path: 'sales/history/import',
        redirect: { path: '/sales/history', query: { import: '1' } }
      },
      {
        path: 'purchases/history',
        name: 'purchase-history-list',
        component: PurchaseHistoryListView
      },
      {
        path: 'purchases/history/import',
        redirect: { path: '/purchases/history', query: { import: '1' } }
      },
      {
        path: 'stock',
        name: 'stock-list',
        component: StockListView
      },
      {
        path: 'reports/sales',
        name: 'sales-report',
        component: SalesReportView
      },
      {
        path: 'reports/customer-sales',
        name: 'customer-sales-report',
        component: CustomerSalesReportView
      },
      {
        path: 'settings/product-groups',
        name: 'product-group-list',
        component: ProductGroupListView
      },
      {
        path: 'settings/product-groups/:id',
        name: 'product-group-detail',
        component: ProductGroupDetailView,
        props: true
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

router.beforeEach(async (to) => {
  const user = firebaseAuth.currentUser || await getCurrentUser()
  if (!to.meta.public && !user) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.name === 'login' && user) return { name: 'dashboard' }
  return true
})

export default router
