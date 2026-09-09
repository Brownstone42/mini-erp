<template>
  <section class="min-w-0 max-w-full overflow-hidden">
    <Dialog v-model:visible="historyDialogVisible" modal dismissable-mask :header="historyDialogTitle" class="w-full max-w-7xl">
      <div v-if="selectedCustomerGroup" class="min-w-0 max-w-full overflow-hidden">
        <div class="mb-4 grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg bg-surface-50 p-4"><p class="text-xs text-surface-500">บริษัทลูกค้า</p><p class="mt-1 font-semibold">{{ selectedCustomerGroup.customerCode }} · {{ selectedCustomerGroup.customerName }}</p></div>
          <div class="rounded-lg bg-surface-50 p-4"><p class="text-xs text-surface-500">ราคาล่าสุด/หน่วยเล็ก</p><p class="mt-1 font-semibold">{{ moneyOrDash(selectedCustomerGroup.latestUnitPrice) }}</p></div>
          <div class="rounded-lg bg-primary-50 p-4"><p class="text-xs text-primary-600">เฉลี่ย {{ selectedCustomerGroup.averageDocumentCount }} ครั้งล่าสุด</p><p class="mt-1 font-semibold text-primary-700">{{ moneyOrDash(selectedCustomerGroup.averageThreeUnitPrice) }}</p></div>
        </div>
        <div class="history-table-scroll w-full min-w-0 overflow-x-auto">
          <DataTable :value="selectedCustomerGroup.history" paginator :rows="10" :rows-per-page-options="[10, 25, 50]" size="small" table-style="min-width: 72rem">
            <Column field="transactionDate" header="วันที่" style="width: 9rem"><template #body="p">{{ displayDate(p.data.transactionDate) }}</template></Column>
            <Column field="documentNumber" header="เลขที่เอกสาร" style="width: 12rem" />
            <Column field="customerName" header="บริษัทลูกค้า" style="min-width: 22rem" />
            <Column header="รายการ" style="width: 7rem"><template #body="p"><Tag :value="p.data.isReturn ? 'คืน' : 'ขาย'" :severity="p.data.isReturn ? 'danger' : 'success'" /></template></Column>
            <Column field="analysisQuantity" header="จำนวนหน่วยเล็ก" style="width: 11rem"><template #body="p">{{ quantity(p.data.analysisQuantity) }}</template></Column>
            <Column field="sourceUnitText" header="หน่วยจาก Express" style="width: 10rem" />
            <Column field="analysisNetAmount" header="ยอดสุทธิ" style="width: 11rem"><template #body="p"><span :class="p.data.isReturn ? 'text-red-600' : ''">{{ money(p.data.analysisNetAmount) }}</span></template></Column>
            <Column field="unitPrice" header="ราคา/หน่วยเล็ก" style="width: 12rem"><template #body="p">{{ moneyOrDash(p.data.unitPrice) }}</template></Column>
          </DataTable>
        </div>
      </div>
    </Dialog>

    <div>
      <p class="text-sm font-medium text-primary-600">Reports</p>
      <h2 class="mt-1 text-3xl font-semibold tracking-tight">ประวัติขายและราคาขายสินค้า</h2>
      <p class="mt-2 text-sm text-surface-500">ค้นหาสินค้า แล้วเปิดดูราคาขายที่แยกตามบริษัทลูกค้า</p>
    </div>

    <section class="mt-6 min-w-0 max-w-full overflow-hidden rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-end gap-4">
        <label class="block min-w-80 flex-1">
          <span class="mb-2 block text-sm font-medium text-surface-600">ค้นหาสินค้า</span>
          <span class="relative block"><i class="pi pi-search absolute left-3 top-1/2 z-10 -translate-y-1/2 text-surface-400" /><InputText v-model="searchTerm" autofocus class="w-full pl-10" placeholder="ชื่อหรือรหัสสินค้า" /></span>
        </label>
        <label class="block w-72"><span class="mb-2 block text-sm font-medium text-surface-600">Product Category</span><Select v-model="selectedCategoryCode" :options="categoryOptions" option-label="label" option-value="value" class="w-full" /></label>
        <label class="block w-72"><span class="mb-2 block text-sm font-medium text-surface-600">Product Group</span><Select v-model="selectedGroupId" :options="groupOptions" option-label="label" option-value="value" class="w-full" :loading="loadingGroup" /></label>
      </div>
      <Message v-if="filterError" severity="error" class="mt-4">{{ filterError }}</Message>
    </section>

    <div class="mt-6 grid gap-4 sm:grid-cols-3">
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">สินค้าที่พบ</p><p class="mt-2 text-3xl font-semibold">{{ reportRows.length.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">รหัสสินค้า</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">สินค้าและบริษัทลูกค้า</p><p class="mt-2 text-3xl font-semibold">{{ customerRelationCount.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">ราคาแยกตามบริษัท</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">ข้อมูลขายล่าสุด</p><p class="mt-2 text-3xl font-semibold">{{ displayDate(latestDate) }}</p><p class="mt-1 text-xs text-surface-400">จากสินค้าที่ค้นพบ</p></div>
    </div>

    <Message v-if="loadError" severity="error" class="mt-6">{{ loadError }}</Message>

    <section class="report-table-card mt-6 min-w-0 overflow-hidden rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="mb-4"><h3 class="font-semibold">สินค้า</h3><p class="mt-1 text-sm text-surface-500">กดสินค้าเพื่อดูราคาขายที่จัดกลุ่มตามบริษัทลูกค้า</p></div>
      <DataTable v-model:expanded-rows="expandedRows" :value="reportRows" :loading="loading" data-key="productCode" paginator :rows="25" :rows-per-page-options="[25, 50, 100]" sort-field="latestSaleDate" :sort-order="-1" removable-sort striped-rows :row-class="productRowClass" table-style="width: 100%; table-layout: fixed" @row-click="toggleProduct">
        <template #empty>{{ searchTerm ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีข้อมูลประวัติขาย' }}</template>
        <Column header="" style="width: 4%"><template #body="p"><i class="pi text-surface-400" :class="isProductExpanded(p.data.productCode) ? 'pi-chevron-down' : 'pi-chevron-right'" /></template></Column>
        <Column field="productCode" header="รหัสสินค้า" sortable style="width: 18%" />
        <Column field="productName" header="ชื่อสินค้า" sortable style="width: 43%"><template #body="p"><span class="break-words">{{ p.data.productName }}</span></template></Column>
        <Column field="customerCount" header="จำนวนบริษัท" sortable style="width: 15%"><template #body="p">{{ p.data.customerCount.toLocaleString('th-TH') }}</template></Column>
        <Column field="documentCount" header="จำนวนเอกสาร" sortable style="width: 10%"><template #body="p">{{ p.data.documentCount.toLocaleString('th-TH') }}</template></Column>
        <Column field="latestSaleDate" header="ขายล่าสุด" sortable style="width: 10%"><template #body="p">{{ displayDate(p.data.latestSaleDate) }}</template></Column>

        <template #expansion="p">
          <div class="min-w-0 max-w-full overflow-hidden border-y border-surface-200 bg-surface-50 p-5" @click.stop>
            <p class="mb-3 font-semibold">ราคาขายแยกตามบริษัท · {{ p.data.productCode }} · {{ p.data.productName }}</p>
            <DataTable :value="p.data.customers" paginator :rows="10" :rows-per-page-options="[10, 25, 50]" size="small" striped-rows :row-class="customerRowClass" table-style="width: 100%; table-layout: fixed" @row-click="openCustomerHistory">
              <Column field="customerName" header="บริษัทลูกค้า" sortable style="width: 38%"><template #body="detail"><p class="text-xs font-medium text-surface-500">{{ detail.data.customerCode }}</p><p class="mt-1 break-words">{{ detail.data.customerName }}</p></template></Column>
              <Column field="latestSaleDate" header="ขายล่าสุด" sortable style="width: 15%"><template #body="detail">{{ displayDate(detail.data.latestSaleDate) }}</template></Column>
              <Column field="latestUnitPrice" header="ราคาล่าสุด" sortable style="width: 15%"><template #body="detail"><span class="font-semibold">{{ moneyOrDash(detail.data.latestUnitPrice) }}</span></template></Column>
              <Column field="averageThreeUnitPrice" header="เฉลี่ย 3 ครั้งล่าสุด" sortable style="width: 20%"><template #body="detail"><p class="font-semibold text-primary-700">{{ moneyOrDash(detail.data.averageThreeUnitPrice) }}</p><p class="mt-1 text-xs text-surface-400">{{ detail.data.averageDocumentCount }} เอกสาร</p></template></Column>
              <Column field="saleDocumentCount" header="เอกสารขาย" sortable style="width: 12%" />
            </DataTable>
            <p class="mt-3 text-xs text-surface-500">กดแถวบริษัทเพื่อดูเอกสารขายทั้งหมด</p>
          </div>
        </template>
      </DataTable>
    </section>
  </section>
</template>

<script>
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { fetchProductGroup, fetchProductGroups } from '../../services/product-group-data.js'
import { fetchProducts } from '../../services/product-data.js'
import { fetchSalesHistory } from '../../services/sales-history-data.js'
import { aggregateProductSalesPrices } from '../../utils/product-sales-price-report.js'

export default {
  name: 'ProductSalesPriceReportView',
  components: { Column, DataTable, Dialog, InputText, Message, Select, Tag },
  data() {
    return {
      salesRows: [], products: [], productGroups: [], loading: true, loadError: '', filterError: '', searchTerm: '',
      selectedCategoryCode: 'ALL', selectedGroupId: 'ALL', selectedGroupProductCodes: new Set(), loadingGroup: false,
      expandedRows: {}, historyDialogVisible: false, selectedCustomerGroup: null
    }
  },
  computed: {
    productMap() { return new Map(this.products.map((product) => [product.productCode, product])) },
    salesProducts() {
      return aggregateProductSalesPrices(this.salesRows).map((row) => {
        const product = this.productMap.get(row.productCode)
        return { ...row, categoryCode: product?.categoryCode || '', categoryName: product?.categoryName || '' }
      })
    },
    categoryOptions() {
      const categories = new Map()
      this.salesProducts.forEach((row) => { if (row.categoryCode) categories.set(row.categoryCode, row.categoryName) })
      return [{ label: 'ทุก Category', value: 'ALL' }, ...[...categories.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([value, name]) => ({ label: `${value} — ${name}`, value }))]
    },
    groupOptions() { return [{ label: 'ทุก Product Group', value: 'ALL' }, ...this.productGroups.map((group) => ({ label: `${group.groupName} (${group.productCount.toLocaleString('th-TH')})`, value: group.id }))] },
    reportRows() {
      const keyword = this.searchTerm.trim().toLocaleLowerCase('th-TH')
      return this.salesProducts.filter((row) => {
        const matchesSearch = !keyword || [row.productCode, row.productName].some((value) => String(value || '').toLocaleLowerCase('th-TH').includes(keyword))
        const matchesCategory = this.selectedCategoryCode === 'ALL' || row.categoryCode === this.selectedCategoryCode
        const matchesGroup = this.selectedGroupId === 'ALL' || this.selectedGroupProductCodes.has(row.productCode)
        return matchesSearch && matchesCategory && matchesGroup
      })
    },
    customerRelationCount() { return this.reportRows.reduce((total, row) => total + row.customerCount, 0) },
    latestDate() { return this.reportRows.reduce((date, row) => !date || row.latestSaleDate > date ? row.latestSaleDate : date, '') },
    historyDialogTitle() { return this.selectedCustomerGroup ? `${this.selectedCustomerGroup.productCode} - ${this.selectedCustomerGroup.productName}` : 'ประวัติขาย' }
  },
  watch: {
    searchTerm() { this.expandedRows = {} },
    selectedCategoryCode() { this.expandedRows = {} },
    selectedGroupId() { this.expandedRows = {}; void this.loadSelectedGroup() }
  },
  async mounted() {
    try { ;[this.salesRows, this.products, this.productGroups] = await Promise.all([fetchSalesHistory(), fetchProducts(), fetchProductGroups()]) }
    catch (error) { console.error(error); this.loadError = 'ไม่สามารถโหลดข้อมูลประวัติขายได้' }
    finally { this.loading = false }
  },
  methods: {
    async loadSelectedGroup() {
      const requestedGroupId = this.selectedGroupId
      this.selectedGroupProductCodes = new Set(); this.filterError = ''
      if (requestedGroupId === 'ALL') { this.loadingGroup = false; return }
      this.loadingGroup = true
      try {
        const group = await fetchProductGroup(requestedGroupId)
        if (this.selectedGroupId === requestedGroupId) this.selectedGroupProductCodes = new Set((group?.items || []).map((item) => item.productCode))
      } catch (error) { console.error(error); if (this.selectedGroupId === requestedGroupId) this.filterError = 'ไม่สามารถโหลดรายการสินค้าใน Product Group ได้' }
      finally { if (this.selectedGroupId === requestedGroupId) this.loadingGroup = false }
    },
    toggleProduct(event) { const code = event.data.productCode; this.expandedRows = this.isProductExpanded(code) ? {} : { [code]: true } },
    isProductExpanded(code) { return Boolean(this.expandedRows[code]) },
    openCustomerHistory(event) { this.selectedCustomerGroup = event.data; this.historyDialogVisible = true },
    productRowClass() { return 'product-sales-row' },
    customerRowClass() { return 'customer-price-row' },
    displayDate(value) { if (!value) return '—'; const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) },
    money(value) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number(value || 0)) },
    moneyOrDash(value) { return value == null ? '—' : this.money(value) },
    quantity(value) { return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 }).format(Number(value || 0)) }
  }
}
</script>

<style scoped>
.report-table-card { width: 100%; max-width: calc(100vw - 20rem); }
:deep(.p-datatable), :deep(.p-datatable-table-container) { min-width: 0; max-width: 100%; }
:deep(.history-table-scroll .p-datatable-table-container) { overflow-x: auto !important; }
:deep(.p-datatable-tbody > tr.product-sales-row), :deep(.p-datatable-tbody > tr.customer-price-row) { cursor: pointer; }
</style>
