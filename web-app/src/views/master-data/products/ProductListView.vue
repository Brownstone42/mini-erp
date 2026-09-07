<template>
  <section>
    <div class="flex items-start justify-between gap-6">
      <div>
        <p class="text-sm font-medium text-primary-600">Master Data</p>
        <h2 class="mt-1 text-3xl font-semibold tracking-tight">Product</h2>
        <p class="mt-2 text-sm text-surface-500">ค้นหาและตรวจสอบข้อมูลสินค้าจาก Express</p>
      </div>
      <Button label="Import from Express" icon="pi pi-upload" @click="openImport" />
    </div>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">Product ทั้งหมด</p><p class="mt-2 text-3xl font-semibold">{{ products.length.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">รายการ</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">ใช้งาน</p><p class="mt-2 text-3xl font-semibold text-primary-600">{{ activeCount.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">รายการ</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">ไม่ใช้งาน</p><p class="mt-2 text-3xl font-semibold text-surface-500">{{ inactiveCount.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">รายการ</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">อัปเดตล่าสุด</p><p class="mt-2 text-lg font-semibold">{{ formatDateTime(latestUpdatedAt) }}</p></div>
    </div>

    <div class="mt-8 rounded-xl border border-surface-200 bg-white shadow-sm">
      <div class="flex flex-wrap items-center gap-4 border-b border-surface-200 p-4">
        <IconField class="min-w-72 flex-1">
          <InputIcon class="pi pi-search" />
          <InputText v-model="search" placeholder="ค้นหารหัส ชื่อสินค้า หรือ Supplier" class="w-full" />
        </IconField>
        <Select v-model="categoryFilter" :options="categoryOptions" option-label="label" option-value="value" class="w-64" />
        <SelectButton v-model="statusFilter" :options="statusOptions" option-label="label" option-value="value" />
      </div>

      <DataTable
        :value="filteredProducts" :loading="isLoading" paginator :rows="25" :rows-per-page-options="[25, 50, 100]"
        data-key="productCode" striped-rows removable-sort table-style="min-width: 72rem" @row-click="openProduct"
      >
        <template #empty><div class="py-10 text-center text-surface-500">{{ loadError || 'ไม่พบ Product ตามเงื่อนไขที่เลือก' }}</div></template>
        <Column field="productCode" header="รหัสสินค้า" sortable style="width: 16rem" />
        <Column field="productName" header="ชื่อสินค้า" sortable />
        <Column field="categoryCode" header="หมวด" style="width: 7rem" />
        <Column field="smallUnit" header="หน่วย" style="width: 7rem" />
        <Column field="supplierCode" header="Supplier" style="width: 10rem" />
        <Column field="standardPrice" header="ราคามาตรฐาน" style="width: 10rem">
          <template #body="slotProps">{{ formatMoney(slotProps.data.standardPrice) }}</template>
        </Column>
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
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import { fetchProducts } from '../../../services/product-data.js'

export default {
  name: 'ProductListView',
  components: { Button, Column, DataTable, IconField, InputIcon, InputText, Select, SelectButton },
  data() {
    return {
      products: [], isLoading: false, loadError: '', search: '', categoryFilter: 'ALL', statusFilter: 'ACTIVE',
      statusOptions: [{ label: 'ใช้งาน', value: 'ACTIVE' }, { label: 'ไม่ใช้งาน', value: 'INACTIVE' }, { label: 'ทั้งหมด', value: 'ALL' }]
    }
  },
  computed: {
    activeCount() { return this.products.filter((product) => product.status === 'ACTIVE').length },
    inactiveCount() { return this.products.length - this.activeCount },
    latestUpdatedAt() { return this.products.reduce((latest, product) => !latest || product.updatedAtRaw > latest ? product.updatedAtRaw : latest, null) },
    categoryOptions() {
      const categories = [...new Map(this.products.map((item) => [item.categoryCode, item.categoryName])).entries()]
      return [{ label: 'ทุกหมวดสินค้า', value: 'ALL' }, ...categories.map(([value, name]) => ({ label: `${value} — ${name}`, value }))]
    },
    filteredProducts() {
      const keyword = this.search.trim().toLocaleLowerCase('th-TH')
      return this.products.filter((product) => {
        const matchesStatus = this.statusFilter === 'ALL' || product.status === this.statusFilter
        const matchesCategory = this.categoryFilter === 'ALL' || product.categoryCode === this.categoryFilter
        const searchable = [product.productCode, product.productName, product.supplierCode, product.supplierName].join(' ').toLocaleLowerCase('th-TH')
        return matchesStatus && matchesCategory && (!keyword || searchable.includes(keyword))
      })
    }
  },
  mounted() { this.loadProducts() },
  methods: {
    async loadProducts() {
      this.isLoading = true
      try { this.products = await fetchProducts() } catch (error) {
        console.error('Unable to load Products', error)
        this.loadError = 'ไม่สามารถโหลดข้อมูล Product ได้'
      } finally { this.isLoading = false }
    },
    openImport() { this.$router.push({ name: 'product-import' }) },
    openProduct(event) { this.$router.push({ name: 'product-detail', params: { productCode: event.data.productCode } }) },
    formatMoney(value) { return value == null ? '—' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(value) }
    ,
    formatDateTime(value) { return value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—' }
  }
}
</script>

<style scoped>:deep(.p-datatable-tbody > tr) { cursor: pointer; }</style>
