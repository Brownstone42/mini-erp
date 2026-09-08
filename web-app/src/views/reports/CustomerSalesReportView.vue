<template>
  <section>
    <div>
      <p class="text-sm font-medium text-primary-600">Reports</p>
      <h2 class="mt-1 text-3xl font-semibold tracking-tight">ยอดขายตามลูกค้า</h2>
      <p class="mt-2 text-sm text-surface-500">สรุปยอดซื้อสุทธิของลูกค้า และกดแต่ละแถวเพื่อดูประวัติการซื้อ</p>
    </div>

    <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-end gap-4">
        <label class="block">
          <span class="mb-2 block text-sm font-medium text-surface-600">วันที่เริ่ม</span>
          <DatePicker v-model="dateStart" date-format="dd/mm/yy" show-icon :min-date="availableStartDate" :max-date="dateEnd || availableEndDate" placeholder="วัน/เดือน/ปี" />
        </label>
        <label class="block">
          <span class="mb-2 block text-sm font-medium text-surface-600">วันที่สิ้นสุด</span>
          <DatePicker v-model="dateEnd" date-format="dd/mm/yy" show-icon :min-date="dateStart || availableStartDate" :max-date="availableEndDate" placeholder="วัน/เดือน/ปี" />
        </label>
        <Button label="แสดงรายงาน" icon="pi pi-search" :disabled="!canApply" @click="applyDateRange" />
        <label class="block min-w-80">
          <span class="mb-2 block text-sm font-medium text-surface-600">ค้นหาลูกค้า</span>
          <InputText v-model="searchTerm" class="w-full" placeholder="ชื่อหรือรหัสลูกค้า" />
        </label>
      </div>
      <Message v-if="dateError" severity="error" class="mt-4">{{ dateError }}</Message>
    </section>

    <div class="mt-6 grid gap-4 sm:grid-cols-3">
      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <p class="text-sm text-surface-500">ยอดซื้อสุทธิ</p>
        <p class="mt-2 text-3xl font-semibold">{{ money(totalSales) }}</p>
        <p class="mt-1 text-xs text-surface-400">บาท · หักรายการคืนแล้ว</p>
      </div>
      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <p class="text-sm text-surface-500">จำนวนลูกค้า</p>
        <p class="mt-2 text-3xl font-semibold">{{ reportRows.length.toLocaleString('th-TH') }}</p>
        <p class="mt-1 text-xs text-surface-400">รายที่มีรายการในช่วงวันที่</p>
      </div>
      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <p class="text-sm text-surface-500">จำนวนเอกสาร</p>
        <p class="mt-2 text-3xl font-semibold">{{ totalDocuments.toLocaleString('th-TH') }}</p>
        <p class="mt-1 text-xs text-surface-400">เอกสารขายและเอกสารคืน</p>
      </div>
    </div>

    <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="mb-4">
        <h3 class="font-semibold">ยอดขายแยกตามลูกค้า</h3>
        <p class="mt-1 text-sm text-surface-500">เรียงตามยอดซื้อสุทธิจากมากไปน้อย · กดแถว Customer เพื่อเปิดหรือปิดประวัติการซื้อ</p>
      </div>

      <DataTable
        v-model:expanded-rows="expandedRows"
        :value="reportRows"
        :loading="loading"
        data-key="customerCode"
        paginator
        :rows="25"
        :rows-per-page-options="[25, 50, 100]"
        sort-field="totalSales"
        :sort-order="-1"
        removable-sort
        striped-rows
        :row-class="customerRowClass"
        @row-click="toggleCustomer"
      >
        <template #empty>{{ loadError || 'ไม่พบข้อมูลในช่วงวันที่ที่เลือก' }}</template>
        <Column header="" style="width: 3rem">
          <template #body="p"><i class="pi text-surface-400" :class="isExpanded(p.data.customerCode) ? 'pi-chevron-down' : 'pi-chevron-right'" /></template>
        </Column>
        <Column field="customerCode" header="รหัสลูกค้า" sortable style="width: 14rem" />
        <Column field="customerName" header="ชื่อลูกค้า" sortable />
        <Column field="documentCount" header="จำนวนเอกสาร" sortable style="width: 12rem">
          <template #body="p">{{ p.data.documentCount.toLocaleString('th-TH') }}</template>
        </Column>
        <Column field="totalSales" header="ยอดซื้อสุทธิ" sortable style="width: 15rem">
          <template #body="p"><span class="font-semibold">{{ money(p.data.totalSales) }}</span></template>
        </Column>

        <template #expansion="p">
          <div class="border-y border-surface-200 bg-surface-50 p-5" @click.stop>
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="font-semibold">ประวัติการซื้อ · {{ p.data.customerName }}</p>
                <p class="mt-1 text-xs text-surface-500">{{ p.data.transactionCount.toLocaleString('th-TH') }} รายการ ในช่วงวันที่ที่เลือก</p>
              </div>
              <span class="text-sm font-semibold text-primary-700">รวม {{ money(p.data.totalSales) }} บาท</span>
            </div>
            <DataTable :value="sortedHistory(p.data.history)" paginator :rows="10" :rows-per-page-options="[10, 25, 50]" size="small">
              <Column field="transactionDate" header="วันที่" style="width: 8.5rem"><template #body="detail">{{ displayDate(detail.data.transactionDate) }}</template></Column>
              <Column field="documentNumber" header="เลขที่เอกสาร" style="width: 12rem" />
              <Column field="productCode" header="รหัสสินค้า" style="width: 12rem" />
              <Column field="productName" header="ชื่อสินค้า" />
              <Column field="analysisQuantity" header="จำนวนสุทธิ" style="width: 10rem"><template #body="detail">{{ quantity(detail.data.analysisQuantity) }} {{ detail.data.sourceUnitText || '' }}</template></Column>
              <Column field="analysisNetAmount" header="ยอดสุทธิ" style="width: 11rem"><template #body="detail"><span :class="detail.data.isReturn ? 'text-red-600' : ''">{{ money(detail.data.analysisNetAmount) }}</span></template></Column>
            </DataTable>
          </div>
        </template>
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
import { fetchSalesHistory } from '../../services/sales-history-data.js'
import { aggregateCustomerSales } from '../../utils/customer-sales-report.js'

export default {
  name: 'CustomerSalesReportView',
  components: { Button, Column, DataTable, DatePicker, InputText, Message },
  data() {
    return {
      salesRows: [],
      loading: true,
      loadError: '',
      dateError: '',
      dateStart: null,
      dateEnd: null,
      appliedStart: '',
      appliedEnd: '',
      searchTerm: '',
      expandedRows: {}
    }
  },
  computed: {
    activeRows() { return this.salesRows.filter((row) => row.isActive !== false) },
    availableStart() { return this.activeRows.reduce((date, row) => !date || row.transactionDate < date ? row.transactionDate : date, '') },
    availableEnd() { return this.activeRows.reduce((date, row) => !date || row.transactionDate > date ? row.transactionDate : date, '') },
    availableStartDate() { return this.parseIsoDate(this.availableStart) },
    availableEndDate() { return this.parseIsoDate(this.availableEnd) },
    canApply() { return this.dateStart && this.dateEnd && this.dateStart.getTime() <= this.dateEnd.getTime() },
    filteredRows() { return this.activeRows.filter((row) => row.transactionDate >= this.appliedStart && row.transactionDate <= this.appliedEnd) },
    customerRows() { return aggregateCustomerSales(this.filteredRows) },
    reportRows() {
      const keyword = this.searchTerm.trim().toLocaleLowerCase('th-TH')
      if (!keyword) return this.customerRows
      return this.customerRows.filter((row) => String(row.customerCode || '').toLocaleLowerCase('th-TH').includes(keyword)
        || String(row.customerName || '').toLocaleLowerCase('th-TH').includes(keyword))
    },
    totalSales() { return this.reportRows.reduce((total, row) => total + row.totalSales, 0) },
    totalDocuments() { return this.reportRows.reduce((total, row) => total + row.documentCount, 0) }
  },
  async mounted() {
    try {
      this.salesRows = await fetchSalesHistory()
      this.dateEnd = this.availableEndDate
      const firstDayOfLatestYear = this.dateEnd ? new Date(this.dateEnd.getFullYear(), 0, 1) : null
      this.dateStart = firstDayOfLatestYear && this.availableStartDate && firstDayOfLatestYear < this.availableStartDate
        ? this.availableStartDate
        : firstDayOfLatestYear
      this.applyDateRange()
    } catch (error) {
      console.error('Unable to load Customer Sales Report', error)
      this.loadError = 'ไม่สามารถโหลดข้อมูลยอดขายตามลูกค้าได้'
    } finally {
      this.loading = false
    }
  },
  methods: {
    applyDateRange() {
      if (!this.canApply) { this.dateError = 'วันที่เริ่มต้องไม่มากกว่าวันที่สิ้นสุด'; return }
      this.dateError = ''
      this.appliedStart = this.toIsoDate(this.dateStart)
      this.appliedEnd = this.toIsoDate(this.dateEnd)
      this.expandedRows = {}
    },
    toggleCustomer(event) {
      const code = event.data.customerCode
      this.expandedRows = this.isExpanded(code) ? {} : { [code]: true }
    },
    isExpanded(customerCode) { return Boolean(this.expandedRows[customerCode]) },
    customerRowClass() { return 'customer-sales-row' },
    sortedHistory(history) {
      return [...history].sort((left, right) => right.transactionDate.localeCompare(left.transactionDate)
        || right.documentNumber.localeCompare(left.documentNumber))
    },
    parseIsoDate(value) { if (!value) return null; const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day) },
    toIsoDate(value) { const year = value.getFullYear(); const month = String(value.getMonth() + 1).padStart(2, '0'); const day = String(value.getDate()).padStart(2, '0'); return `${year}-${month}-${day}` },
    displayDate(value) { return this.parseIsoDate(value)?.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) || '-' },
    money(value) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0) },
    quantity(value) { return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 }).format(value || 0) }
  }
}
</script>

<style scoped>
:deep(.p-datatable-tbody > tr.customer-sales-row) {
  cursor: pointer;
}
</style>
