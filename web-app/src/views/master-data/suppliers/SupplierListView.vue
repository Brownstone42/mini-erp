<template>
  <section>
    <div class="flex items-start justify-between gap-6">
      <div>
        <p class="text-sm font-medium text-primary-600">Master Data</p>
        <h2 class="mt-1 text-3xl font-semibold tracking-tight">Supplier</h2>
        <p class="mt-2 text-sm text-surface-500">ค้นหาและตรวจสอบข้อมูลผู้จำหน่ายจาก Express</p>
      </div>
      <Button label="Import from Express" icon="pi pi-upload" @click="openImport" />
    </div>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">Supplier ทั้งหมด</p><p class="mt-2 text-3xl font-semibold">{{ suppliers.length.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">รายการ</p></div>
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
        :value="filteredSuppliers"
        :loading="isLoading"
        paginator
        :rows="25"
        :rows-per-page-options="[25, 50, 100]"
        data-key="supplierCode"
        striped-rows
        removable-sort
        table-style="min-width: 60rem"
        @row-click="openSupplier"
      >
        <template #empty>
          <div class="py-10 text-center text-surface-500">{{ loadError || 'ไม่พบ Supplier ตามเงื่อนไขที่เลือก' }}</div>
        </template>
        <Column field="supplierCode" header="รหัส" sortable style="width: 9rem" />
        <Column field="supplierName" header="ชื่อ Supplier" sortable style="width: 55%" />
        <Column field="taxId" header="เลขผู้เสียภาษี" style="width: 20rem" />
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

import { fetchSuppliers } from '../../../services/supplier-data.js'

export default {
  name: 'SupplierListView',
  components: {
    Button,
    Column,
    DataTable,
    IconField,
    InputIcon,
    InputText,
    SelectButton
  },
  data() {
    return {
      suppliers: [],
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
    activeCount() { return this.suppliers.filter((supplier) => supplier.status === 'ACTIVE').length },
    inactiveCount() { return this.suppliers.length - this.activeCount },
    latestUpdatedAt() { return this.suppliers.reduce((latest, supplier) => !latest || supplier.updatedAtRaw > latest ? supplier.updatedAtRaw : latest, null) },
    filteredSuppliers() {
      const keyword = this.search.trim().toLocaleLowerCase('th-TH')

      return this.suppliers.filter((supplier) => {
        const matchesStatus = this.statusFilter === 'ALL' || supplier.status === this.statusFilter
        const searchable = [
          supplier.supplierCode,
          supplier.supplierName,
          supplier.taxId,
          supplier.phone
        ].join(' ').toLocaleLowerCase('th-TH')

        return matchesStatus && (!keyword || searchable.includes(keyword))
      })
    }
  },
  mounted() {
    this.loadSuppliers()
  },
  methods: {
    async loadSuppliers() {
      this.isLoading = true
      this.loadError = ''
      try {
        this.suppliers = await fetchSuppliers()
      } catch (error) {
        console.error('Unable to load suppliers', error)
        this.loadError = 'ไม่สามารถโหลดข้อมูล Supplier ได้'
      } finally {
        this.isLoading = false
      }
    },
    openImport() {
      this.$router.push({ name: 'supplier-import' })
    },
    openSupplier(event) {
      this.$router.push({
        name: 'supplier-detail',
        params: { supplierCode: event.data.supplierCode }
      })
    },
    formatDateTime(value) {
      return value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
    }
  }
}
</script>

<style scoped>
:deep(.p-datatable-tbody > tr) {
  cursor: pointer;
}
</style>
