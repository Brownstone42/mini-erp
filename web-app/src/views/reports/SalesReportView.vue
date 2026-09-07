<template>
  <section>
    <div>
      <p class="text-sm font-medium text-primary-600">Reports</p>
      <h2 class="mt-1 text-3xl font-semibold tracking-tight">รายงานยอดขาย</h2>
      <p class="mt-2 text-sm text-surface-500">สรุปยอดขายสุทธิและจำนวนขายแยกตามสินค้า โดยหักรายการคืนแล้ว</p>
    </div>

    <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-end gap-4">
        <label class="block"><span class="mb-2 block text-sm font-medium text-surface-600">วันที่เริ่ม</span><DatePicker v-model="dateStart" date-format="dd/mm/yy" show-icon :min-date="availableStartDate" :max-date="dateEnd || availableEndDate" placeholder="วัน/เดือน/ปี" /></label>
        <label class="block"><span class="mb-2 block text-sm font-medium text-surface-600">วันที่สิ้นสุด</span><DatePicker v-model="dateEnd" date-format="dd/mm/yy" show-icon :min-date="dateStart || availableStartDate" :max-date="availableEndDate" placeholder="วัน/เดือน/ปี" /></label>
        <Button label="แสดงรายงาน" icon="pi pi-search" :disabled="!canApply" @click="applyDateRange" />
        <label class="block min-w-64"><span class="mb-2 block text-sm font-medium text-surface-600">Product Group</span><Select v-model="selectedGroupId" :options="groupOptions" option-label="label" option-value="value" placeholder="เลือก Group ที่สนใจ" class="w-full" :loading="loadingGroup" /></label>
        <label class="block min-w-72"><span class="mb-2 block text-sm font-medium text-surface-600">ค้นหาสินค้า</span><InputText v-model="searchTerm" class="w-full" placeholder="ชื่อหรือรหัสสินค้า" /></label>
      </div>
      <Message v-if="dateError" severity="error" class="mt-4">{{ dateError }}</Message>
      <Message v-if="groupError" severity="error" class="mt-4">{{ groupError }}</Message>
      <Message v-if="groupSuccess" severity="success" class="mt-4">{{ groupSuccess }}</Message>
    </section>

    <div class="mt-6 grid gap-4 sm:grid-cols-3">
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">ยอดขายสุทธิ</p><p class="mt-2 text-3xl font-semibold">{{ money(totalSales) }}</p><p class="mt-1 text-xs text-surface-400">บาท · หักยอดคืนแล้ว</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">จำนวนขายสุทธิ</p><p class="mt-2 text-3xl font-semibold">{{ quantity(totalQuantity) }}</p><p class="mt-1 text-xs text-surface-400">หน่วยวิเคราะห์ · หักจำนวนคืนแล้ว</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">สินค้าที่มียอดขาย</p><p class="mt-2 text-3xl font-semibold">{{ reportRows.length.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">รายการสินค้า</p></div>
    </div>

    <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="mb-4"><h3 class="font-semibold">ยอดขายแยกตามสินค้า</h3><p class="mt-1 text-sm text-surface-500">กดหัวคอลัมน์ยอดขายหรือจำนวนขายเพื่อเปลี่ยนลำดับ</p></div>
      <DataTable :value="reportRows" :loading="loading" paginator :rows="25" :rows-per-page-options="[25,50,100]" sort-field="totalSales" :sort-order="-1" removable-sort striped-rows>
        <template #empty>{{ loadError || 'ไม่พบข้อมูลในช่วงวันที่ที่เลือก' }}</template>
        <Column field="productCode" header="รหัสสินค้า" sortable style="width: 16rem" />
        <Column field="productName" header="ชื่อสินค้า" sortable />
        <Column field="totalQuantity" header="จำนวนขายสุทธิ" sortable style="width: 14rem"><template #body="p">{{ quantity(p.data.totalQuantity) }}</template></Column>
        <Column field="totalSales" header="ยอดขายสุทธิ" sortable style="width: 14rem"><template #body="p">{{ money(p.data.totalSales) }}</template></Column>
        <Column header="Product Group" style="width: 12rem">
          <template #body="p">
            <span v-if="isProductInSelectedGroup(p.data.productCode)" class="inline-flex items-center gap-2 text-primary-600" title="สินค้านี้อยู่ใน Group ที่เลือกแล้ว">
              <i class="pi pi-check-circle text-xl" aria-hidden="true" />
              <span class="text-sm font-medium">อยู่ใน Group แล้ว</span>
            </span>
            <Button v-else label="Add to Group" icon="pi pi-plus" severity="secondary" size="small" outlined :loading="addingProductCode === p.data.productCode" :disabled="!selectedGroupId || loadingGroup || Boolean(addingProductCode)" @click="addToGroup(p.data)" />
          </template>
        </Column>
      </DataTable>
    </section>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import { fetchSalesHistory } from '../../services/sales-history-data.js'
import { addProductToGroup, fetchProductGroup, fetchProductGroups } from '../../services/product-group-data.js'

export default {
  name: 'SalesReportView',
  components: { Button, Column, DataTable, DatePicker, InputText, Message, Select },
  data() { return { salesRows: [], productGroups: [], loading: true, loadError: '', dateError: '', dateStart: null, dateEnd: null, appliedStart: '', appliedEnd: '', searchTerm: '', selectedGroupId: null, selectedGroupProductCodes: new Set(), loadingGroup: false, addingProductCode: '', groupError: '', groupSuccess: '' } },
  computed: {
    activeRows() { return this.salesRows.filter((row) => row.isActive !== false) },
    availableStart() { return this.activeRows.reduce((date, row) => !date || row.transactionDate < date ? row.transactionDate : date, '') },
    availableEnd() { return this.activeRows.reduce((date, row) => !date || row.transactionDate > date ? row.transactionDate : date, '') },
    availableStartDate() { return this.parseIsoDate(this.availableStart) },
    availableEndDate() { return this.parseIsoDate(this.availableEnd) },
    canApply() { return this.dateStart && this.dateEnd && this.dateStart.getTime() <= this.dateEnd.getTime() },
    filteredRows() { return this.activeRows.filter((row) => row.transactionDate >= this.appliedStart && row.transactionDate <= this.appliedEnd) },
    aggregatedRows() {
      const products = new Map()
      this.filteredRows.forEach((row) => {
        const current = products.get(row.productCode) || { productCode: row.productCode, productName: row.productName, totalQuantity: 0, totalSales: 0 }
        current.totalQuantity += Number(row.analysisQuantity || 0)
        current.totalSales += Number(row.analysisNetAmount || 0)
        products.set(row.productCode, current)
      })
      return [...products.values()]
    },
    reportRows() {
      const keyword = this.searchTerm.trim().toLocaleLowerCase('th-TH')
      if (!keyword) return this.aggregatedRows
      return this.aggregatedRows.filter((row) => String(row.productCode || '').toLocaleLowerCase('th-TH').includes(keyword)
        || String(row.productName || '').toLocaleLowerCase('th-TH').includes(keyword))
    },
    totalSales() { return this.reportRows.reduce((total, row) => total + row.totalSales, 0) },
    totalQuantity() { return this.reportRows.reduce((total, row) => total + row.totalQuantity, 0) },
    groupOptions() { return this.productGroups.map((group) => ({ label: group.groupName, value: group.id })) }
  },
  watch: {
    selectedGroupId() { void this.loadSelectedGroup() }
  },
  async mounted() {
    try {
      ;[this.salesRows, this.productGroups] = await Promise.all([fetchSalesHistory(), fetchProductGroups()])
      this.dateEnd = this.availableEndDate
      const firstDayOfLatestYear = this.dateEnd ? new Date(this.dateEnd.getFullYear(), 0, 1) : null
      this.dateStart = firstDayOfLatestYear && this.availableStartDate && firstDayOfLatestYear < this.availableStartDate
        ? this.availableStartDate
        : firstDayOfLatestYear
      this.applyDateRange()
    } catch (error) {
      console.error('Unable to load Sales Report', error)
      this.loadError = 'ไม่สามารถโหลดข้อมูลรายงานยอดขายได้'
    } finally { this.loading = false }
  },
  methods: {
    applyDateRange() {
      if (!this.canApply) { this.dateError = 'วันที่เริ่มต้องไม่มากกว่าวันที่สิ้นสุด'; return }
      this.dateError = ''
      this.appliedStart = this.toIsoDate(this.dateStart)
      this.appliedEnd = this.toIsoDate(this.dateEnd)
    },
    async loadSelectedGroup() {
      const requestedGroupId = this.selectedGroupId
      this.selectedGroupProductCodes = new Set()
      this.groupError = ''
      this.groupSuccess = ''
      if (!requestedGroupId) { this.loadingGroup = false; return }
      this.loadingGroup = true
      try {
        const group = await fetchProductGroup(requestedGroupId)
        if (this.selectedGroupId === requestedGroupId) this.selectedGroupProductCodes = new Set((group?.items || []).map((item) => item.productCode))
      } catch (error) {
        console.error(error)
        if (this.selectedGroupId === requestedGroupId) this.groupError = 'ไม่สามารถโหลดรายการสินค้าใน Product Group ได้'
      } finally {
        if (this.selectedGroupId === requestedGroupId) this.loadingGroup = false
      }
    },
    isProductInSelectedGroup(productCode) { return this.selectedGroupId && this.selectedGroupProductCodes.has(productCode) },
    async addToGroup(product) {
      if (!this.selectedGroupId || !product || this.addingProductCode) return
      this.addingProductCode = product.productCode
      this.groupError = ''
      this.groupSuccess = ''
      try {
        await addProductToGroup(this.selectedGroupId, product.productCode)
        this.selectedGroupProductCodes = new Set([...this.selectedGroupProductCodes, product.productCode])
        const groupName = this.productGroups.find((group) => group.id === this.selectedGroupId)?.groupName || 'Product Group'
        this.groupSuccess = `เพิ่ม ${product.productCode} เข้า ${groupName} แล้ว`
      } catch (error) { console.error(error); this.groupError = 'ไม่สามารถเพิ่มสินค้าเข้า Product Group ได้' }
      finally { this.addingProductCode = '' }
    },
    parseIsoDate(value) { if (!value) return null; const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day) },
    toIsoDate(value) { const year = value.getFullYear(); const month = String(value.getMonth() + 1).padStart(2, '0'); const day = String(value.getDate()).padStart(2, '0'); return `${year}-${month}-${day}` },
    money(value) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0) },
    quantity(value) { return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 }).format(value || 0) }
  }
}
</script>

<style scoped></style>
