import { createRouter, createWebHistory } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { firebaseAuth } from '../services/firebase.js'
import { useCompanyStore } from '../stores/company.js'
import { pinia } from '../stores/pinia.js'

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
const ProductPurchaseCostReportView = () => import('../views/reports/ProductPurchaseCostReportView.vue')
const ProductSalesPriceReportView = () => import('../views/reports/ProductSalesPriceReportView.vue')
const ProductGroupListView = () => import('../views/settings/ProductGroupListView.vue')
const ProductGroupDetailView = () => import('../views/settings/ProductGroupDetailView.vue')
const SignatoryListView = () => import('../views/settings/SignatoryListView.vue')
const QuotationCreateView = () => import('../views/sales/QuotationCreateView.vue')
const CompanyWorkspaceView = () => import('../views/CompanyWorkspaceView.vue')

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
        path: 'company',
        name: 'company-workspace',
        component: CompanyWorkspaceView
      },
      {
        path: 'master-data/suppliers',
        name: 'supplier-list',
        component: SupplierListView,
        meta: { keepAlive: true, scrollKey: 'supplier-list' }
      },
      {
        path: 'master-data/suppliers/import',
        name: 'supplier-import',
        component: SupplierImportView,
        meta: { returnScrollKey: 'supplier-list' }
      },
      {
        path: 'master-data/suppliers/:supplierCode',
        name: 'supplier-detail',
        component: SupplierDetailView,
        props: true,
        meta: { returnScrollKey: 'supplier-list' }
      },
      {
        path: 'master-data/customers',
        name: 'customer-list',
        component: CustomerListView,
        meta: { keepAlive: true, scrollKey: 'customer-list' }
      },
      {
        path: 'master-data/customers/import',
        name: 'customer-import',
        component: CustomerImportView,
        meta: { returnScrollKey: 'customer-list' }
      },
      {
        path: 'master-data/customers/:customerCode',
        name: 'customer-detail',
        component: CustomerDetailView,
        props: true,
        meta: { returnScrollKey: 'customer-list' }
      },
      {
        path: 'master-data/products',
        name: 'product-list',
        component: ProductListView,
        meta: { keepAlive: true, scrollKey: 'product-list' }
      },
      {
        path: 'master-data/products/import',
        name: 'product-import',
        component: ProductImportView,
        meta: { returnScrollKey: 'product-list' }
      },
      {
        path: 'master-data/products/:productCode',
        name: 'product-detail',
        component: ProductDetailView,
        props: true,
        meta: { returnScrollKey: 'product-list' }
      },
      {
        path: 'master-data/product-categories',
        name: 'product-category-list',
        component: ProductCategoryListView,
        meta: { keepAlive: true, scrollKey: 'product-category-list' }
      },
      {
        path: 'master-data/product-categories/:categoryCode',
        name: 'product-category-detail',
        component: ProductCategoryDetailView,
        props: true,
        meta: { returnScrollKey: 'product-category-list' }
      },
      {
        path: 'sales/quotations/new',
        name: 'quotation-create',
        component: QuotationCreateView
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
        path: 'reports/product-purchase-cost',
        name: 'product-purchase-cost-report',
        component: ProductPurchaseCostReportView
      },
      {
        path: 'reports/product-sales-price',
        name: 'product-sales-price-report',
        component: ProductSalesPriceReportView
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
      },
      {
        path: 'settings/signatories',
        name: 'signatory-list',
        component: SignatoryListView
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const masterDataScrollPositions = new Map()

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition

    const scrollKey = to.meta.scrollKey
    if (scrollKey && from.meta.returnScrollKey === scrollKey && masterDataScrollPositions.has(scrollKey)) {
      const top = masterDataScrollPositions.get(scrollKey)
      return new Promise((resolve) => {
        requestAnimationFrame(() => resolve({ top }))
      })
    }

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

router.beforeEach(async (to, from) => {
  const scrollKey = from.meta.scrollKey
  if (scrollKey && to.meta.returnScrollKey === scrollKey) {
    masterDataScrollPositions.set(scrollKey, window.scrollY)
  }

  const user = firebaseAuth.currentUser || await getCurrentUser()
  if (!to.meta.public && !user) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.name === 'login' && user) return { name: 'dashboard' }
  if (user && !to.meta.public) {
    const companyStore = useCompanyStore(pinia)
    if (!companyStore.isIdealGlobe && to.name !== 'company-workspace') return { name: 'company-workspace' }
    if (companyStore.isIdealGlobe && to.name === 'company-workspace') return { name: 'dashboard' }
  }
  return true
})

export default router
