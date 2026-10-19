<template>
  <section>
    <Button label="กลับไป Purchase Planning" icon="pi pi-arrow-left" severity="secondary" text @click="$router.back()" />

    <div class="mt-4">
      <p class="text-sm font-medium text-primary-600">Analysis · Purchase Planning</p>
      <h2 class="mt-1 text-3xl font-semibold">{{ product?.productName || productCode }}</h2>
      <p class="mt-2 text-sm text-surface-500">{{ productCode }}</p>
    </div>

    <Message v-if="error" severity="error" class="mt-6">{{ error }}</Message>
    <div v-else-if="loading" class="mt-6 rounded-xl border border-surface-200 bg-white p-6 text-surface-500">
      กำลังโหลดข้อมูลสินค้า...
    </div>
    <div v-else class="mt-6 grid gap-4 md:grid-cols-3">
      <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-surface-500">คงเหลือ</p>
        <p class="mt-2 text-2xl font-semibold text-surface-900">{{ quantityList(stockSummary) }}</p>
        <p class="mt-2 text-xs text-surface-500">Stock Snapshot {{ date(latestStockDate) }}</p>
      </div>
      <button type="button" class="rounded-xl border border-surface-200 bg-white p-5 text-left shadow-sm transition hover:border-primary-300 hover:shadow-md" @click="pendingVisible = true">
        <p class="text-sm text-surface-500">ค้างส่ง</p>
        <p class="mt-2 text-2xl font-semibold text-surface-900">{{ quantityList(pendingSummary) }}</p>
        <p class="mt-2 text-xs text-surface-500">รายงานวันที่ {{ date(latestPendingSnapshot?.reportDate) }} · กดเพื่อดูรายการ</p>
      </button>
      <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-surface-500">รับเข้าล่าสุด</p>
        <p class="mt-2 text-2xl font-semibold text-surface-900">{{ quantityList(latestReceiptSummary) }}</p>
        <p class="mt-2 text-xs text-surface-500">{{ latestReceipt ? `วันที่ ${date(latestReceipt.transactionDate)} · ${latestReceipt.supplierName || 'ไม่ระบุ Supplier'}` : 'ยังไม่มีประวัติรับเข้า' }}</p>
      </div>
    </div>

    <Tabs v-if="!loading && !error" v-model:value="activeTab" class="mt-6">
      <TabList>
        <Tab value="monthly-sales">ยอดขายรายเดือน</Tab>
        <Tab value="company-sales">ยอดขายรายบริษัท</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="monthly-sales">
          <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold">ประวัติขายย้อนหลัง 12 เดือน</h3>
              <p class="mt-1 text-sm text-surface-500">รวมทุกบริษัท · {{ date(period.start) }} – {{ date(period.end) }} · เดือนปัจจุบันยังไม่จบ</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-surface-500">ขายรวม 12 เดือน</p>
              <p class="mt-1 text-lg font-semibold">{{ quantityList(totalSalesSummary) }}</p>
            </div>
          </div>
          <DataTable :value="monthlySalesRows" sort-field="month" :sort-order="-1" striped-rows scrollable>
            <Column field="month" header="เดือน" sortable style="min-width: 12rem"><template #body="p">{{ monthLabel(p.data.month) }}{{ p.data.month === period.currentMonth ? ' (ยังไม่จบ)' : '' }}</template></Column>
            <Column header="ขาย" style="min-width: 12rem"><template #body="p">{{ quantityList(p.data.sales) }}</template></Column>
            <Column header="คืน" style="min-width: 12rem"><template #body="p">{{ quantityList(p.data.returns) }}</template></Column>
            <Column header="ขายสุทธิ" style="min-width: 12rem"><template #body="p"><span class="font-semibold">{{ quantityList(p.data.net) }}</span></template></Column>
          </DataTable>
        </TabPanel>
        <TabPanel value="company-sales">
          <div class="mb-4">
            <h3 class="text-lg font-semibold">ยอดขายแยกรายบริษัท</h3>
            <p class="mt-1 text-sm text-surface-500">จำนวนขายสุทธิรายเดือนย้อนหลัง 12 เดือน · เรียงตามยอดรวมมากไปน้อย</p>
          </div>
          <div ref="companyTopScroll" class="company-top-scroll mb-2 overflow-x-auto overflow-y-hidden" @scroll="syncCompanyScrollFromTop">
            <div class="h-px w-[137rem]" />
          </div>
          <DataTable ref="companyTable" :value="companySalesRows" sort-field="sortTotal" :sort-order="-1" striped-rows scrollable class="company-sales-table">
            <template #empty>ไม่มีประวัติขายในช่วงนี้</template>
            <Column field="customerName" header="บริษัท" frozen sortable style="min-width: 18rem" />
            <Column v-for="month in monthKeys" :key="month" :header="shortMonthLabel(month)" :sort-field="monthSortField(month)" sortable style="min-width: 9rem">
              <template #body="p">{{ quantityList(p.data.months[month] || []) }}</template>
            </Column>
            <Column field="sortTotal" header="รวม 12 เดือน" frozen align-frozen="right" sortable style="min-width: 11rem">
              <template #body="p"><span class="font-semibold">{{ quantityList(p.data.total) }}</span></template>
            </Column>
          </DataTable>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <Dialog v-model:visible="pendingVisible" modal dismissable-mask header="รายการค้างส่ง" class="w-[96vw] max-w-6xl">
      <div class="mb-4">
        <p class="font-semibold">{{ productCode }} · {{ product?.productName }}</p>
        <p class="mt-1 text-sm text-surface-500">รายงานวันที่ {{ date(latestPendingSnapshot?.reportDate) }} · รวม {{ quantityList(pendingSummary) }}</p>
      </div>
      <DataTable :value="productPendingRows" paginator :rows="10" striped-rows scrollable>
        <template #empty>ไม่มีรายการค้างส่งของสินค้านี้</template>
        <Column header="กำหนดส่ง" style="min-width: 9rem"><template #body="p">{{ date(p.data.deliveryDate) }}</template></Column>
        <Column field="customerName" header="บริษัท" style="min-width: 18rem" />
        <Column field="documentNumber" header="เลขที่เอกสาร" style="min-width: 11rem" />
        <Column header="จำนวนตาม Express" style="min-width: 10rem"><template #body="p">{{ quantity(p.data.pendingQuantity) }} {{ p.data.sourceUnitText }}</template></Column>
        <Column header="จำนวนหน่วยฐาน" style="min-width: 11rem"><template #body="p"><span class="font-semibold">{{ convertedPendingQuantity(p.data) }}</span></template></Column>
      </DataTable>
    </Dialog>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import { fetchProduct } from '../../services/product-data.js'
import { fetchPurchaseHistory } from '../../services/purchase-history.js'
import { fetchSalesHistory } from '../../services/sales-history-data.js'
import { fetchStockSnapshots } from '../../services/stock-data.js'
import { fetchPendingOrderSnapshots, fetchPendingOrderSnapshotDetails } from '../../services/pending-orders-data.js'
import { fetchUnitMappings } from '../../services/unit-mapping-data.js'
import { fetchProductUnitConversions } from '../../services/product-unit-conversion-data.js'
import { amountsByUnit, createQuantityConverter, createUnitResolver, planningPeriod } from '../../utils/purchase-planning.js'

export default {
  name: 'PurchasePlanningDetailView',
  components: { Button, Column, DataTable, Dialog, Message, Tab, TabList, TabPanel, TabPanels, Tabs },
  props: {
    productCode: { type: String, required: true }
  },
  data() {
    return {
      product: null,
      stockRows: [],
      pendingRows: [],
      purchaseRows: [],
      salesRows: [],
      latestPendingSnapshot: null,
      unitMappings: [],
      productConversions: [],
      universalConversions: [],
      pendingVisible: false,
      activeTab: 'monthly-sales',
      companyScrollElement: null,
      period: planningPeriod(),
      loading: true,
      error: ''
    }
  },
  computed: {
    resolveUnit() { return createUnitResolver(this.unitMappings) },
    convertQuantity() {
      return createQuantityConverter({
        resolveUnit: this.resolveUnit,
        productConversions: this.productConversions,
        universalConversions: this.universalConversions
      })
    },
    latestStockDate() {
      return this.stockRows.reduce((latest, row) => row.isActive !== false && row.snapshotDate > latest ? row.snapshotDate : latest, '')
    },
    stockSummary() {
      return amountsByUnit(
        this.stockRows.filter((row) => row.isActive !== false && row.productCode === this.productCode && row.snapshotDate === this.latestStockDate),
        'quantity', 'sourceUnitText', this.resolveUnit, this.convertQuantity
      )
    },
    pendingSummary() {
      return amountsByUnit(
        this.productPendingRows,
        'pendingQuantity', 'sourceUnitText', this.resolveUnit, this.convertQuantity
      )
    },
    productPendingRows() {
      return this.pendingRows
        .filter((row) => row.productCode === this.productCode)
        .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) || a.documentNumber.localeCompare(b.documentNumber))
    },
    latestReceipt() {
      return this.purchaseRows
        .filter((row) => row.isActive !== false && row.productCode === this.productCode && !row.isReturn && Number(row.sourceQuantity) > 0)
        .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))[0] || null
    },
    latestReceiptSummary() {
      return this.latestReceipt
        ? amountsByUnit([this.latestReceipt], 'sourceQuantity', 'sourceUnitText', this.resolveUnit, this.convertQuantity)
        : []
    },
    productSalesRows() {
      return this.salesRows.filter((row) =>
        row.isActive !== false && row.productCode === this.productCode &&
        row.transactionDate >= this.period.start && row.transactionDate <= this.period.end
      )
    },
    monthlySalesRows() {
      const rowsByMonth = new Map()
      for (const row of this.productSalesRows) {
        const month = row.transactionDate.slice(0, 7)
        if (!rowsByMonth.has(month)) rowsByMonth.set(month, { sales: [], returns: [] })
        rowsByMonth.get(month)[row.isReturn ? 'returns' : 'sales'].push(row)
      }
      return this.monthKeys.map((month) => {
        const rows = rowsByMonth.get(month) || { sales: [], returns: [] }
        const sales = amountsByUnit(rows.sales, 'sourceQuantity', 'sourceUnitText', this.resolveUnit, this.convertQuantity)
        const returns = amountsByUnit(rows.returns, 'sourceQuantity', 'sourceUnitText', this.resolveUnit, this.convertQuantity)
        return { month, sales, returns, net: this.subtractAmounts(sales, returns) }
      })
    },
    monthKeys() {
      const keys = []
      const start = new Date(`${this.period.start}T00:00:00`)
      for (let index = 0; index < 12; index += 1) {
        const date = new Date(start.getFullYear(), start.getMonth() + index, 1)
        keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
      }
      return keys
    },
    totalSalesSummary() {
      return amountsByUnit(
        this.productSalesRows.filter((row) => !row.isReturn),
        'sourceQuantity', 'sourceUnitText', this.resolveUnit, this.convertQuantity
      )
    },
    companySalesRows() {
      const companies = new Map()
      for (const row of this.productSalesRows) {
        const customerKey = row.customerCode || row.customerName || 'ไม่ระบุบริษัท'
        if (!companies.has(customerKey)) companies.set(customerKey, {
          customerCode: row.customerCode || '',
          customerName: row.customerName || 'ไม่ระบุบริษัท',
          monthlyRows: new Map()
        })
        const month = row.transactionDate.slice(0, 7)
        const company = companies.get(customerKey)
        if (!company.monthlyRows.has(month)) company.monthlyRows.set(month, { sales: [], returns: [] })
        company.monthlyRows.get(month)[row.isReturn ? 'returns' : 'sales'].push(row)
      }

      return [...companies.values()].map((company) => {
        const months = {}
        for (const month of this.monthKeys) {
          const rows = company.monthlyRows.get(month) || { sales: [], returns: [] }
          const sales = amountsByUnit(rows.sales, 'sourceQuantity', 'sourceUnitText', this.resolveUnit, this.convertQuantity)
          const returns = amountsByUnit(rows.returns, 'sourceQuantity', 'sourceUnitText', this.resolveUnit, this.convertQuantity)
          months[month] = this.subtractAmounts(sales, returns)
        }
        const allRows = [...company.monthlyRows.values()]
        const totalSales = amountsByUnit(allRows.flatMap((item) => item.sales), 'sourceQuantity', 'sourceUnitText', this.resolveUnit, this.convertQuantity)
        const totalReturns = amountsByUnit(allRows.flatMap((item) => item.returns), 'sourceQuantity', 'sourceUnitText', this.resolveUnit, this.convertQuantity)
        const total = this.subtractAmounts(totalSales, totalReturns)
        const sortValues = Object.fromEntries(this.monthKeys.map((month) => [this.monthSortField(month), this.amountSortValue(months[month])]))
        return { customerCode: company.customerCode, customerName: company.customerName, months, total, sortTotal: this.amountSortValue(total), ...sortValues }
      }).sort((a, b) => this.amountSortValue(b.total) - this.amountSortValue(a.total) || a.customerName.localeCompare(b.customerName, 'th'))
    }
  },
  watch: {
    activeTab(value) {
      if (value === 'company-sales') this.$nextTick(() => this.bindCompanyScroll())
    }
  },
  async mounted() {
    try {
      const [product, stock, pendingSnapshots, purchaseRows, salesRows, unitMappings, conversions] = await Promise.all([
        fetchProduct(this.productCode),
        fetchStockSnapshots(),
        fetchPendingOrderSnapshots(),
        fetchPurchaseHistory(),
        fetchSalesHistory(),
        fetchUnitMappings(),
        fetchProductUnitConversions()
      ])
      this.product = product
      this.stockRows = stock.rows
      this.purchaseRows = purchaseRows
      this.salesRows = salesRows
      this.unitMappings = unitMappings
      this.productConversions = conversions.productConversions
      this.universalConversions = conversions.universalConversions
      this.latestPendingSnapshot = pendingSnapshots[0] || null
      if (this.latestPendingSnapshot) {
        const pending = await fetchPendingOrderSnapshotDetails(this.latestPendingSnapshot.id)
        this.pendingRows = pending.rows
      }
      if (!this.product) this.error = 'ไม่พบสินค้านี้ใน Product Master Data'
    } catch (error) {
      console.error(error)
      this.error = 'ไม่สามารถโหลดข้อมูลสินค้าได้'
    } finally {
      this.loading = false
      this.$nextTick(() => this.bindCompanyScroll())
    }
  },
  beforeUnmount() {
    if (this.companyScrollElement) this.companyScrollElement.removeEventListener('scroll', this.syncCompanyScrollFromTable)
  },
  methods: {
    quantity(value) {
      return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 }).format(Number(value || 0))
    },
    quantityList(items) {
      return items.length ? items.map((item) => `${this.quantity(item.quantity)} ${item.unit}`).join(' · ') : 'ไม่มีรายการ'
    },
    convertedPendingQuantity(row) {
      return this.quantityList(amountsByUnit([row], 'pendingQuantity', 'sourceUnitText', this.resolveUnit, this.convertQuantity))
    },
    subtractAmounts(sales, returns) {
      const totals = new Map()
      for (const item of sales) totals.set(item.unit, (totals.get(item.unit) || 0) + item.quantity)
      for (const item of returns) totals.set(item.unit, (totals.get(item.unit) || 0) - item.quantity)
      return [...totals].map(([unit, quantity]) => ({ unit, quantity })).sort((a, b) => a.unit.localeCompare(b.unit, 'th'))
    },
    amountSortValue(items) {
      return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    },
    monthSortField(month) {
      return `sort_${month.replace('-', '_')}`
    },
    bindCompanyScroll() {
      const element = this.$refs.companyTable?.$el?.querySelector('.p-datatable-table-container')
      if (!element || element === this.companyScrollElement) return
      if (this.companyScrollElement) this.companyScrollElement.removeEventListener('scroll', this.syncCompanyScrollFromTable)
      this.companyScrollElement = element
      element.addEventListener('scroll', this.syncCompanyScrollFromTable, { passive: true })
      if (this.$refs.companyTopScroll) this.$refs.companyTopScroll.scrollLeft = element.scrollLeft
    },
    syncCompanyScrollFromTop(event) {
      this.bindCompanyScroll()
      if (this.companyScrollElement && this.companyScrollElement.scrollLeft !== event.target.scrollLeft) {
        this.companyScrollElement.scrollLeft = event.target.scrollLeft
      }
    },
    syncCompanyScrollFromTable(event) {
      const top = this.$refs.companyTopScroll
      if (top && top.scrollLeft !== event.target.scrollLeft) top.scrollLeft = event.target.scrollLeft
    },
    date(value) {
      return value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : '—'
    },
    monthLabel(value) {
      return new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T00:00:00`))
    },
    shortMonthLabel(value) {
      return new Intl.DateTimeFormat('th-TH', { month: 'short', year: '2-digit' }).format(new Date(`${value}-01T00:00:00`))
    }
  }
}
</script>

<style scoped>
.company-top-scroll { scrollbar-gutter: stable; }
</style>
