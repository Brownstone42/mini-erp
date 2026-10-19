<template>
  <section>
    <div>
      <p class="text-sm font-medium text-primary-600">Analysis</p>
      <h2 class="mt-1 text-3xl font-semibold">Purchase Planning</h2>
      <p class="mt-2 text-sm text-surface-500">ดูยอดขายย้อนหลัง คงเหลือ และค้างส่งประกอบการวางแผนซื้อ · ยังไม่คำนวณจำนวนแนะนำให้ซื้อ</p>
    </div>

    <Message v-if="error" severity="error" class="mt-5">{{ error }}</Message>
    <div class="mt-6 grid gap-4 md:grid-cols-3">
      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <p class="text-sm text-surface-500">Sales History</p>
        <p class="mt-2 font-semibold">{{ date(period.start) }} – {{ date(period.end) }}</p>
        <p class="mt-1 text-xs text-surface-500">12 เดือน รวมเดือนปัจจุบันที่ยังไม่จบ · ข้อมูลล่าสุด {{ date(latestSalesDate) }}</p>
      </div>
      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <p class="text-sm text-surface-500">Stock Snapshot</p>
        <p class="mt-2 font-semibold">{{ date(selectedStock?.date) }}</p>
        <p class="mt-1 text-xs text-surface-500">{{ selectedStock?.label || 'ยังไม่มี Snapshot' }}</p>
      </div>
      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <p class="text-sm text-surface-500">Pending Orders</p>
        <p class="mt-2 font-semibold">พิมพ์รายงาน {{ date(selectedPending?.reportDate) }}</p>
        <p class="mt-1 text-xs text-surface-500">กำหนดส่ง {{ date(selectedPending?.periodStart) }} – {{ date(selectedPending?.periodEnd) }}</p>
      </div>
    </div>

    <Message severity="warn" class="mt-4">ระบบรวมชื่อหน่วยด้วย Unit Mapping แล้วแปลงจำนวนด้วย Conversion รายสินค้า ส่วนรายการที่ยังไม่มี Conversion จะแสดงแยกหน่วยเพื่อไม่ให้คำนวณผิด</Message>

    <div class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="grid gap-4 md:grid-cols-3">
        <label class="block"><span class="mb-2 block text-sm font-medium text-surface-600">ค้นหาสินค้า</span><InputText v-model="searchTerm" class="w-full" placeholder="รหัสหรือชื่อสินค้า" /></label>
        <label class="block"><span class="mb-2 block text-sm font-medium text-surface-600">Category</span><Select v-model="categoryCode" :options="categoryOptions" option-label="label" option-value="value" class="w-full" /></label>
        <label class="block"><span class="mb-2 block text-sm font-medium text-surface-600">Product Group</span><Select v-model="groupId" :options="groupOptions" option-label="label" option-value="value" class="w-full" /></label>
      </div>
      <div class="mt-5 border-t border-surface-200 pt-4">
        <p class="mb-3 text-sm font-medium text-surface-600">ตัวกรองเพิ่มเติม</p>
        <div class="flex flex-wrap gap-x-6 gap-y-3">
          <label class="flex cursor-pointer items-center gap-2"><Checkbox v-model="hideNoSales" binary input-id="hide-no-sales" /><span class="text-sm">มีขาย 12 เดือน</span></label>
          <label class="flex cursor-pointer items-center gap-2"><Checkbox v-model="hideNoStock" binary input-id="hide-no-stock" /><span class="text-sm">มีคงเหลือ</span></label>
          <label class="flex cursor-pointer items-center gap-2"><Checkbox v-model="onlyPending" binary input-id="only-pending" /><span class="text-sm">มีค้างส่ง</span></label>
        </div>
      </div>
    </div>

    <div class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between gap-3">
        <div><h3 class="text-lg font-semibold">สินค้า</h3><p class="text-sm text-surface-500">{{ filteredRows.length.toLocaleString('th-TH') }} รายการ · กดแถวเพื่อดูรายเดือนและบริษัท</p></div>
      </div>
      <div ref="planningTopScroll" class="planning-top-scroll mb-2 overflow-x-auto overflow-y-hidden" @scroll="syncPlanningScrollFromTop">
        <div class="h-px w-[72rem]" />
      </div>
      <DataTable ref="planningTable" :value="filteredRows" :loading="loading || pendingLoading || groupLoading" paginator :rows="25" :rows-per-page-options="[25, 50, 100]" striped-rows scrollable class="planning-table" @row-click="openRow">
        <template #empty>ไม่พบสินค้าในเงื่อนไขที่เลือก</template>
        <Column field="productCode" header="รหัสสินค้า" sortable style="min-width: 12rem" />
        <Column field="productName" header="ชื่อสินค้า" sortable style="min-width: 18rem" />
        <Column header="ขาย 12 เดือน" style="min-width: 10rem"><template #body="p">{{ quantityList(p.data.sales) }}</template></Column>
        <Column field="netSalesAmount" header="จำนวนเงิน 12 เดือน" sortable style="min-width: 12rem"><template #body="p"><span class="font-semibold">{{ money(p.data.netSalesAmount) }}</span></template></Column>
        <Column header="คงเหลือ" style="min-width: 10rem"><template #body="p">{{ quantityList(p.data.stock) }}</template></Column>
        <Column header="ค้างส่ง" style="min-width: 10rem"><template #body="p">{{ quantityList(p.data.pending) }}</template></Column>
      </DataTable>
    </div>
  </section>
</template>

<script>
import Column from 'primevue/column'
import Checkbox from 'primevue/checkbox'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import { fetchProducts, fetchProductCategories } from '../../services/product-data.js'
import { fetchProductGroups, fetchProductGroup } from '../../services/product-group-data.js'
import { fetchSalesHistory } from '../../services/sales-history-data.js'
import { fetchStockSnapshots } from '../../services/stock-data.js'
import { fetchPendingOrderSnapshots, fetchPendingOrderSnapshotDetails } from '../../services/pending-orders-data.js'
import { fetchUnitMappings } from '../../services/unit-mapping-data.js'
import { fetchProductUnitConversions } from '../../services/product-unit-conversion-data.js'
import { amountsByUnit, createQuantityConverter, createUnitResolver, planningPeriod } from '../../utils/purchase-planning.js'

export default {
  name: 'PurchasePlanningView',
  components: { Checkbox, Column, DataTable, InputText, Message, Select },
  data() { return {
    products: [], categories: [], groups: [], groupCodes: null, unitMappings: [], productConversions: [], universalConversions: [], salesRows: [], stockRows: [], pendingSnapshots: [], pendingRows: [],
    selectedStockKey: null, selectedPendingId: null, searchTerm: '', categoryCode: null, groupId: null,
    hideNoSales: false, hideNoStock: false, onlyPending: false,
    loading: true, pendingLoading: false, groupLoading: false, planningScrollElement: null, error: '', period: planningPeriod()
  } },
  computed: {
    categoryOptions() { return [{ label: 'ทุก Category', value: null }, ...this.categories.map((item) => ({ label: `${item.categoryCode} · ${item.categoryName}`, value: item.categoryCode }))] },
    groupOptions() { return [{ label: 'ทุก Product Group', value: null }, ...this.groups.map((item) => ({ label: item.groupName, value: item.id }))] },
    stockOptions() {
      const options = new Map()
      for (const row of this.stockRows) {
        const value = `${row.snapshotDate}|${row.warehouseFrom}|${row.warehouseTo}`
        if (!options.has(value)) options.set(value, { value, date: row.snapshotDate, label: `${this.date(row.snapshotDate)} · คลัง ${row.warehouseFrom}–${row.warehouseTo}` })
      }
      return [...options.values()].sort((a, b) => b.date.localeCompare(a.date))
    },
    selectedStock() { return this.stockOptions.find((item) => item.value === this.selectedStockKey) },
    selectedPending() { return this.pendingSnapshots.find((item) => item.id === this.selectedPendingId) },
    resolveUnit() { return createUnitResolver(this.unitMappings) },
    convertQuantity() { return createQuantityConverter({ resolveUnit: this.resolveUnit, productConversions: this.productConversions, universalConversions: this.universalConversions }) },
    latestSalesDate() { return this.salesRows.reduce((latest, row) => row.isActive !== false && row.transactionDate > latest ? row.transactionDate : latest, '') },
    productRows() {
      const salesMap = new Map()
      for (const row of this.salesRows) {
        if (row.isActive === false || row.transactionDate < this.period.start || row.transactionDate > this.period.end) continue
        if (!salesMap.has(row.productCode)) salesMap.set(row.productCode, { sold: [], returned: [] })
        salesMap.get(row.productCode)[row.isReturn ? 'returned' : 'sold'].push(row)
      }
      const stockMap = new Map()
      for (const row of this.stockRows) {
        if (row.isActive === false || `${row.snapshotDate}|${row.warehouseFrom}|${row.warehouseTo}` !== this.selectedStockKey) continue
        if (!stockMap.has(row.productCode)) stockMap.set(row.productCode, [])
        stockMap.get(row.productCode).push(row)
      }
      const pendingMap = new Map()
      for (const row of this.pendingRows) {
        if (!pendingMap.has(row.productCode)) pendingMap.set(row.productCode, [])
        pendingMap.get(row.productCode).push(row)
      }
      const byCode = new Map(this.products.map((product) => [product.productCode, product]))
      for (const row of this.pendingRows) {
        if (!byCode.has(row.productCode)) byCode.set(row.productCode, { productCode: row.productCode, productName: row.sourceProductName, isActive: false, unmatched: true })
      }
      return [...byCode.values()].map((product) => {
        const sales = amountsByUnit(salesMap.get(product.productCode)?.sold || [], 'sourceQuantity', 'sourceUnitText', this.resolveUnit, this.convertQuantity)
        const returns = amountsByUnit(salesMap.get(product.productCode)?.returned || [], 'sourceQuantity', 'sourceUnitText', this.resolveUnit, this.convertQuantity)
        const netSalesAmount = [...(salesMap.get(product.productCode)?.sold || []), ...(salesMap.get(product.productCode)?.returned || [])]
          .reduce((total, row) => total + Number(row.analysisNetAmount || 0), 0)
        const stock = amountsByUnit(stockMap.get(product.productCode) || [], 'quantity', 'sourceUnitText', this.resolveUnit, this.convertQuantity)
        const pending = amountsByUnit(pendingMap.get(product.productCode) || [], 'pendingQuantity', 'sourceUnitText', this.resolveUnit, this.convertQuantity)
        const unitMismatch = new Set([...sales, ...returns, ...stock, ...pending].map((item) => item.unit)).size > 1
        return { ...product, sales, returns, netSalesAmount, stock, pending, unitMismatch }
      }).sort((a, b) => a.productCode.localeCompare(b.productCode))
    },
    filteredRows() {
      const term = this.searchTerm.trim().toLocaleLowerCase('th-TH')
      return this.productRows.filter((row) =>
        (!term || row.productCode.toLocaleLowerCase('th-TH').includes(term) || row.productName.toLocaleLowerCase('th-TH').includes(term)) &&
        (!this.categoryCode || row.categoryCode === this.categoryCode) &&
        (!this.groupId || this.groupCodes?.has(row.productCode)) &&
        (!this.hideNoSales || row.sales.length > 0) &&
        (!this.hideNoStock || row.stock.length > 0) &&
        (!this.onlyPending || row.pending.length > 0)
      )
    }
  },
  watch: {
    selectedPendingId() { void this.loadPending() },
    groupId() { void this.loadGroup() }
  },
  async mounted() { await this.load(); this.$nextTick(() => this.bindPlanningScroll()) },
  beforeUnmount() {
    if (this.planningScrollElement) this.planningScrollElement.removeEventListener('scroll', this.syncPlanningScrollFromTable)
  },
  methods: {
    async load() {
      this.loading = true; this.error = ''
      try {
        const [products, categories, groups, unitMappings, conversions, salesRows, stock, pendingSnapshots] = await Promise.all([
          fetchProducts(), fetchProductCategories(), fetchProductGroups(), fetchUnitMappings(), fetchProductUnitConversions(), fetchSalesHistory(), fetchStockSnapshots(), fetchPendingOrderSnapshots()
        ])
        this.products = products; this.categories = categories; this.groups = groups; this.unitMappings = unitMappings; this.salesRows = salesRows
        this.productConversions = conversions.productConversions; this.universalConversions = conversions.universalConversions
        this.stockRows = stock.rows; this.pendingSnapshots = pendingSnapshots
        this.selectedStockKey = this.stockOptions[0]?.value || null
        this.selectedPendingId = pendingSnapshots[0]?.id || null
      } catch (error) { console.error(error); this.error = 'ไม่สามารถโหลดข้อมูลวางแผนซื้อได้' }
      finally { this.loading = false }
    },
    async loadPending() {
      const id = this.selectedPendingId
      this.pendingRows = []
      this.pendingLoading = Boolean(id)
      if (!id) return
      try {
        const result = await fetchPendingOrderSnapshotDetails(id)
        if (this.selectedPendingId === id) this.pendingRows = result.rows
      } catch (error) { console.error(error); this.error = 'ไม่สามารถโหลดรายการค้างส่งได้' }
      finally { if (this.selectedPendingId === id) this.pendingLoading = false }
    },
    async loadGroup() {
      const id = this.groupId
      this.groupCodes = null
      this.groupLoading = Boolean(id)
      if (!id) return
      try {
        const group = await fetchProductGroup(id)
        if (this.groupId === id) this.groupCodes = new Set((group?.items || []).map((item) => item.productCode))
      } catch (error) { console.error(error); this.error = 'ไม่สามารถโหลด Product Group ได้' }
      finally { if (this.groupId === id) this.groupLoading = false }
    },
    openRow(event) { this.$router.push({ name: 'purchase-planning-detail', params: { productCode: event.data.productCode } }) },
    quantity(value) { return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 }).format(Number(value || 0)) },
    money(value) { return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2 }).format(Number(value || 0)) },
    bindPlanningScroll() {
      const element = this.$refs.planningTable?.$el?.querySelector('.p-datatable-table-container')
      if (!element || element === this.planningScrollElement) return
      if (this.planningScrollElement) this.planningScrollElement.removeEventListener('scroll', this.syncPlanningScrollFromTable)
      this.planningScrollElement = element
      element.addEventListener('scroll', this.syncPlanningScrollFromTable, { passive: true })
      if (this.$refs.planningTopScroll) this.$refs.planningTopScroll.scrollLeft = element.scrollLeft
    },
    syncPlanningScrollFromTop(event) {
      this.bindPlanningScroll()
      if (this.planningScrollElement && this.planningScrollElement.scrollLeft !== event.target.scrollLeft) this.planningScrollElement.scrollLeft = event.target.scrollLeft
    },
    syncPlanningScrollFromTable(event) {
      const top = this.$refs.planningTopScroll
      if (top && top.scrollLeft !== event.target.scrollLeft) top.scrollLeft = event.target.scrollLeft
    },
    quantityList(items) { return items.length ? items.map((item) => `${this.quantity(item.quantity)} ${item.unit}`).join(' · ') : 'ไม่มีรายการ' },
    date(value) { return value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : '—' }
  }
}
</script>

<style scoped>
:deep(.planning-table .p-datatable-tbody > tr) { cursor: pointer; }
.planning-top-scroll { scrollbar-gutter: stable; }
</style>
