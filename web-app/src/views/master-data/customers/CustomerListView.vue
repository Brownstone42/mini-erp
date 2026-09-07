<template>
  <section>
    <div class="flex items-start justify-between gap-6">
      <div>
        <p class="text-sm font-medium text-primary-600">Master Data</p>
        <h2 class="mt-1 text-3xl font-semibold tracking-tight">Customer</h2>
        <p class="mt-2 text-sm text-surface-500">ค้นหาและตรวจสอบข้อมูลลูกค้าจาก Express</p>
      </div>
      <Button label="Import from Express" icon="pi pi-upload" @click="openImport" />
    </div>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">Customer ทั้งหมด</p><p class="mt-2 text-3xl font-semibold">{{ customers.length.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">รายการ</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">ใช้งาน</p><p class="mt-2 text-3xl font-semibold text-primary-600">{{ activeCount.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">รายการ</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">ไม่ใช้งาน</p><p class="mt-2 text-3xl font-semibold text-surface-500">{{ inactiveCount.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">รายการ</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">อัปเดตล่าสุด</p><p class="mt-2 text-lg font-semibold">{{ formatDateTime(latestUpdatedAt) }}</p></div>
    </div>

    <div class="mt-8 rounded-xl border border-surface-200 bg-white shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-surface-200 p-4">
        <IconField class="w-full max-w-md">
          <InputIcon class="pi pi-search" />
          <InputText v-model="search" placeholder="ค้นหารหัส ชื่อ เลขผู้เสียภาษี หรือเบอร์โทร" class="w-full" />
        </IconField>
        <SelectButton v-model="statusFilter" :options="statusOptions" option-label="label" option-value="value" />
      </div>

      <DataTable
        :value="filteredCustomers"
        :loading="isLoading"
        paginator
        :rows="25"
        :rows-per-page-options="[25, 50, 100]"
        data-key="customerCode"
        striped-rows
        removable-sort
        table-style="min-width: 65rem"
        @row-click="openCustomer"
      >
        <template #empty>
          <div class="py-10 text-center text-surface-500">{{ loadError || 'ไม่พบ Customer ตามเงื่อนไขที่เลือก' }}</div>
        </template>
        <Column field="customerCode" header="รหัส" sortable style="width: 9rem" />
        <Column field="customerName" header="ชื่อ Customer" sortable style="width: 48%" />
        <Column field="taxId" header="เลขผู้เสียภาษี" style="width: 18rem" />
        <Column field="salespersonCode" header="พนักงานขาย" style="width: 10rem" />
        <Column field="creditDays" header="เครดิต (วัน)" sortable style="width: 9rem" />
      </DataTable>
    </div>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'
import { fetchCustomers } from '../../../services/customer-data.js'

export default {
  name: 'CustomerListView',
  components: { Button, Column, DataTable, IconField, InputIcon, InputText, SelectButton },
  data() {
    return {
      customers: [],
      isLoading: false,
      loadError: '',
      search: '',
      statusFilter: 'ACTIVE',
      statusOptions: [
        { label: 'ใช้งาน', value: 'ACTIVE' },
        { label: 'ไม่ใช้งาน', value: 'INACTIVE' },
        { label: 'ทั้งหมด', value: 'ALL' }
      ]
    }
  },
  computed: {
    activeCount() { return this.customers.filter((customer) => customer.status === 'ACTIVE').length },
    inactiveCount() { return this.customers.length - this.activeCount },
    latestUpdatedAt() { return this.customers.reduce((latest, customer) => !latest || customer.updatedAtRaw > latest ? customer.updatedAtRaw : latest, null) },
    filteredCustomers() {
      const keyword = this.search.trim().toLocaleLowerCase('th-TH')
      return this.customers.filter((customer) => {
        const matchesStatus = this.statusFilter === 'ALL' || customer.status === this.statusFilter
        const searchable = [customer.customerCode, customer.customerName, customer.taxId, customer.phone]
          .join(' ')
          .toLocaleLowerCase('th-TH')
        return matchesStatus && (!keyword || searchable.includes(keyword))
      })
    }
  },
  mounted() {
    this.loadCustomers()
  },
  methods: {
    async loadCustomers() {
      this.isLoading = true
      this.loadError = ''
      try {
        this.customers = await fetchCustomers()
      } catch (error) {
        console.error('Unable to load customers', error)
        this.loadError = 'ไม่สามารถโหลดข้อมูล Customer ได้'
      } finally {
        this.isLoading = false
      }
    },
    openImport() {
      this.$router.push({ name: 'customer-import' })
    },
    openCustomer(event) {
      this.$router.push({ name: 'customer-detail', params: { customerCode: event.data.customerCode } })
    },
    formatDateTime(value) {
      return value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
    }
  }
}
</script>

<style scoped>
:deep(.p-datatable-tbody > tr) { cursor: pointer; }
</style>
