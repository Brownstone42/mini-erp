<template>
  <section class="min-w-0 max-w-full overflow-hidden">
    <div>
      <p class="text-sm font-medium text-primary-600">Reports</p>
      <h2 class="mt-1 text-3xl font-semibold tracking-tight">ประวัติซื้อและต้นทุนสินค้า</h2>
      <p class="mt-2 text-sm text-surface-500">ค้นหาสินค้าเพื่อดูราคาซื้อล่าสุดและต้นทุนเฉลี่ย แยกตาม Supplier</p>
    </div>

    <section class="mt-6 min-w-0 max-w-full overflow-hidden rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-end gap-4">
        <label class="block min-w-80 flex-1">
          <span class="mb-2 block text-sm font-medium text-surface-600">ค้นหาสินค้า</span>
          <span class="relative block">
            <i class="pi pi-search absolute left-3 top-1/2 z-10 -translate-y-1/2 text-surface-400" />
            <InputText v-model="searchTerm" autofocus class="w-full pl-10" placeholder="ชื่อหรือรหัสสินค้า" />
          </span>
        </label>
        <label class="block w-72">
          <span class="mb-2 block text-sm font-medium text-surface-600">Product Category</span>
          <Select v-model="selectedCategoryCode" :options="categoryOptions" option-label="label" option-value="value" class="w-full" />
        </label>
        <label class="block w-72">
          <span class="mb-2 block text-sm font-medium text-surface-600">Product Group</span>
          <Select v-model="selectedGroupId" :options="groupOptions" option-label="label" option-value="value" class="w-full" :loading="loadingGroup" />
        </label>
      </div>
      <p class="mt-3 text-xs text-surface-500">ค้นหาด้วยชื่อหรือรหัสสินค้าได้ทันที และสามารถพิมพ์ชื่อ Supplier เพื่อกรองเพิ่มเติม</p>
      <Message v-if="filterError" severity="error" class="mt-4">{{ filterError }}</Message>
    </section>

    <div class="mt-6 grid gap-4 sm:grid-cols-3">
      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <p class="text-sm text-surface-500">สินค้าที่พบ</p>
        <p class="mt-2 text-3xl font-semibold">{{ productCount.toLocaleString('th-TH') }}</p>
        <p class="mt-1 text-xs text-surface-400">รหัสสินค้า</p>
      </div>
      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <p class="text-sm text-surface-500">สินค้าและ Supplier</p>
        <p class="mt-2 text-3xl font-semibold">{{ reportRows.length.toLocaleString('th-TH') }}</p>
        <p class="mt-1 text-xs text-surface-400">แยก Supplier เพื่อไม่ให้ต้นทุนปนกัน</p>
      </div>
      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <p class="text-sm text-surface-500">ข้อมูลซื้อล่าสุด</p>
        <p class="mt-2 text-3xl font-semibold">{{ displayDate(latestDate) }}</p>
        <p class="mt-1 text-xs text-surface-400">จากรายการที่ค้นพบ</p>
      </div>
    </div>

    <Message v-if="loadError" severity="error" class="mt-6">{{ loadError }}</Message>

    <section class="report-table-card mt-6 min-w-0 overflow-hidden rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="mb-4">
        <h3 class="font-semibold">ต้นทุนแยกตามสินค้าและ Supplier</h3>
        <p class="mt-1 text-sm text-surface-500">ค่าเฉลี่ย 3 ครั้งเป็นค่าเฉลี่ยถ่วงน้ำหนักตามจำนวนซื้อสุทธิในหน่วยเล็ก · กดแถวเพื่อดูประวัติทั้งหมด</p>
      </div>

      <div class="w-full min-w-0 overflow-hidden">
        <DataTable
          v-model:expanded-rows="expandedRows"
          class="w-full min-w-0"
          :value="reportRows"
          :loading="loading"
          data-key="rowKey"
          paginator
          :rows="25"
          :rows-per-page-options="[25, 50, 100]"
          sort-field="latestPurchaseDate"
          :sort-order="-1"
          removable-sort
          striped-rows
          :row-class="purchaseRowClass"
          table-style="width: 100%; table-layout: fixed"
          @row-click="toggleRow"
        >
          <template #empty>{{ searchTerm ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีข้อมูลประวัติซื้อ' }}</template>
          <Column header="" style="width: 3%"><template #body="p"><i class="pi text-surface-400" :class="isExpanded(p.data.rowKey) ? 'pi-chevron-down' : 'pi-chevron-right'" /></template></Column>
          <Column field="productCode" header="รหัสสินค้า" sortable style="width: 11%"><template #body="p"><span class="break-words">{{ p.data.productCode }}</span></template></Column>
          <Column field="productName" header="ชื่อสินค้า" sortable style="width: 25%"><template #body="p"><span class="break-words">{{ p.data.productName }}</span></template></Column>
          <Column field="supplierName" header="Supplier" sortable style="width: 27%">
            <template #body="p">
              <p class="text-xs font-medium text-surface-500">{{ p.data.supplierCode }}</p>
              <p class="mt-1 break-words">{{ p.data.supplierName }}</p>
            </template>
          </Column>
          <Column field="latestPurchaseDate" header="ซื้อล่าสุด" sortable style="width: 10%"><template #body="p">{{ displayDate(p.data.latestPurchaseDate) }}</template></Column>
          <Column field="latestUnitCost" header="ต้นทุนล่าสุด" sortable style="width: 10%"><template #body="p"><span class="font-semibold">{{ moneyOrDash(p.data.latestUnitCost) }}</span></template></Column>
          <Column field="averageThreeUnitCost" header="เฉลี่ย 3 ครั้งล่าสุด" sortable style="width: 14%"><template #body="p"><div class="font-semibold text-primary-700">{{ moneyOrDash(p.data.averageThreeUnitCost) }}</div><div class="mt-1 text-xs text-surface-400">{{ p.data.averageDocumentCount }} เอกสาร</div></template></Column>

          <template #expansion="p">
            <div class="min-w-0 max-w-full overflow-hidden border-y border-surface-200 bg-surface-50 p-5" @click.stop>
              <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="font-semibold">{{ p.data.productCode }} · {{ p.data.productName }}</p>
                  <p class="mt-1 text-sm text-surface-500">{{ p.data.supplierCode }} · {{ p.data.supplierName }}</p>
                </div>
                <div class="text-right text-sm">
                  <p><span class="text-surface-500">ต้นทุนล่าสุด</span> <span class="ml-2 font-semibold">{{ moneyOrDash(p.data.latestUnitCost) }}</span></p>
                  <p class="mt-1"><span class="text-surface-500">เฉลี่ย {{ p.data.averageDocumentCount }} ครั้งล่าสุด</span> <span class="ml-2 font-semibold text-primary-700">{{ moneyOrDash(p.data.averageThreeUnitCost) }}</span></p>
                </div>
              </div>
              <div class="history-table-scroll w-full min-w-0 overflow-x-auto">
                <DataTable :value="p.data.history" paginator :rows="10" :rows-per-page-options="[10, 25, 50]" size="small" table-style="min-width: 78rem">
                  <Column field="transactionDate" header="วันที่" style="width: 9rem"><template #body="detail">{{ displayDate(detail.data.transactionDate) }}</template></Column>
                  <Column field="documentNumber" header="เลขที่เอกสาร" style="width: 12rem" />
                  <Column field="supplierName" header="Supplier" style="min-width: 24rem" />
                  <Column header="รายการ" style="width: 7rem"><template #body="detail"><Tag :value="detail.data.isReturn ? 'คืน' : 'ซื้อ'" :severity="detail.data.isReturn ? 'danger' : 'success'" /></template></Column>
                  <Column field="analysisQuantity" header="จำนวนหน่วยเล็ก" style="width: 11rem"><template #body="detail">{{ quantity(detail.data.analysisQuantity) }}</template></Column>
                  <Column field="sourceUnitText" header="หน่วยจาก Express" style="width: 10rem" />
                  <Column field="analysisNetAmount" header="ยอดสุทธิ" style="width: 11rem"><template #body="detail"><span :class="detail.data.isReturn ? 'text-red-600' : ''">{{ money(detail.data.analysisNetAmount) }}</span></template></Column>
                  <Column field="unitCost" header="ต้นทุน/หน่วยเล็ก" style="width: 12rem"><template #body="detail">{{ moneyOrDash(detail.data.unitCost) }}</template></Column>
                </DataTable>
              </div>
            </div>
          </template>
        </DataTable>
      </div>
    </section>
  </section>
</template>

<script>
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { fetchProducts } from '../../services/product-data.js'
import { fetchProductGroup, fetchProductGroups } from '../../services/product-group-data.js'
import { fetchPurchaseHistory } from '../../services/purchase-history.js'
import { aggregateProductPurchaseCosts } from '../../utils/product-purchase-cost-report.js'

export default {
  name: 'ProductPurchaseCostReportView',
  components: { Column, DataTable, InputText, Message, Select, Tag },
  data() {
    return {
      purchaseRows: [], products: [], productGroups: [], loading: true, loadError: '', filterError: '',
      searchTerm: '', selectedCategoryCode: 'ALL', selectedGroupId: 'ALL', selectedGroupProductCodes: new Set(),
      loadingGroup: false, expandedRows: {}
    }
  },
  computed: {
    productMap() { return new Map(this.products.map((product) => [product.productCode, product])) },
    costRows() {
      return aggregateProductPurchaseCosts(this.purchaseRows).map((row) => {
        const product = this.productMap.get(row.productCode)
        return { ...row, categoryCode: product?.categoryCode || '', categoryName: product?.categoryName || '' }
      })
    },
    categoryOptions() {
      const categories = new Map()
      this.costRows.forEach((row) => { if (row.categoryCode) categories.set(row.categoryCode, row.categoryName) })
      return [{ label: 'ทุก Category', value: 'ALL' }, ...[...categories.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([value, name]) => ({ label: `${value} — ${name}`, value }))]
    },
    groupOptions() {
      return [{ label: 'ทุก Product Group', value: 'ALL' }, ...this.productGroups.map((group) => ({
        label: `${group.groupName} (${group.productCount.toLocaleString('th-TH')})`, value: group.id
      }))]
    },
    reportRows() {
      const keyword = this.searchTerm.trim().toLocaleLowerCase('th-TH')
      return this.costRows.filter((row) => {
        const matchesSearch = !keyword || [row.productCode, row.productName, row.supplierCode, row.supplierName]
          .some((value) => String(value || '').toLocaleLowerCase('th-TH').includes(keyword))
        const matchesCategory = this.selectedCategoryCode === 'ALL' || row.categoryCode === this.selectedCategoryCode
        const matchesGroup = this.selectedGroupId === 'ALL' || this.selectedGroupProductCodes.has(row.productCode)
        return matchesSearch && matchesCategory && matchesGroup
      })
    },
    productCount() { return new Set(this.reportRows.map((row) => row.productCode)).size },
    latestDate() { return this.reportRows.reduce((date, row) => !date || row.latestPurchaseDate > date ? row.latestPurchaseDate : date, '') }
  },
  watch: {
    searchTerm() { this.expandedRows = {} },
    selectedCategoryCode() { this.expandedRows = {} },
    selectedGroupId() { this.expandedRows = {}; void this.loadSelectedGroup() }
  },
  async mounted() {
    try {
      ;[this.purchaseRows, this.products, this.productGroups] = await Promise.all([
        fetchPurchaseHistory(), fetchProducts(), fetchProductGroups()
      ])
    }
    catch (error) { console.error(error); this.loadError = 'ไม่สามารถโหลดข้อมูลประวัติซื้อได้' }
    finally { this.loading = false }
  },
  methods: {
    async loadSelectedGroup() {
      const requestedGroupId = this.selectedGroupId
      this.selectedGroupProductCodes = new Set()
      this.filterError = ''
      if (requestedGroupId === 'ALL') { this.loadingGroup = false; return }
      this.loadingGroup = true
      try {
        const group = await fetchProductGroup(requestedGroupId)
        if (this.selectedGroupId === requestedGroupId) {
          this.selectedGroupProductCodes = new Set((group?.items || []).map((item) => item.productCode))
        }
      } catch (error) {
        console.error(error)
        if (this.selectedGroupId === requestedGroupId) this.filterError = 'ไม่สามารถโหลดรายการสินค้าใน Product Group ได้'
      } finally {
        if (this.selectedGroupId === requestedGroupId) this.loadingGroup = false
      }
    },
    toggleRow(event) {
      const key = event.data.rowKey
      this.expandedRows = this.isExpanded(key) ? {} : { [key]: true }
    },
    isExpanded(key) { return Boolean(this.expandedRows[key]) },
    purchaseRowClass() { return 'purchase-cost-row' },
    displayDate(value) {
      if (!value) return '—'
      const [year, month, day] = value.split('-').map(Number)
      return new Date(year, month - 1, day).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
    },
    money(value) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number(value || 0)) },
    moneyOrDash(value) { return value == null ? '—' : this.money(value) },
    quantity(value) { return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 }).format(Number(value || 0)) }
  }
}
</script>

<style scoped>
:deep(.p-datatable-tbody > tr.purchase-cost-row) {
  cursor: pointer;
}

.report-table-card {
  width: 100%;
  max-width: calc(100vw - 20rem);
}

:deep(.p-datatable),
:deep(.p-datatable-table-container) {
  min-width: 0;
  max-width: 100%;
}

:deep(.history-table-scroll .p-datatable-table-container) {
  overflow-x: auto !important;
}
</style>
