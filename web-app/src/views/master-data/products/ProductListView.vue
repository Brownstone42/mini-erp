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
          <InputText v-model="search" placeholder="ค้นหารหัส ชื่อสินค้า หรือ Product Group" class="w-full" />
        </IconField>
        <Select v-model="categoryFilter" :options="categoryOptions" option-label="label" option-value="value" class="w-64" />
        <Select v-model="productGroupFilter" :options="productGroupOptions" option-label="label" option-value="value" class="w-64" />
        <Select v-model="selectedGroupId" :options="targetGroupOptions" option-label="label" option-value="value" placeholder="เลือก Group ที่จะเพิ่ม" class="w-64" />
        <SelectButton v-model="statusFilter" :options="statusOptions" option-label="label" option-value="value" />
      </div>
      <Message v-if="groupError" severity="error" class="mx-4 mt-4">{{ groupError }}</Message>
      <Message v-if="groupSuccess" severity="success" class="mx-4 mt-4">{{ groupSuccess }}</Message>

      <DataTable
        :value="filteredProducts" :loading="isLoading" paginator :rows="25" :rows-per-page-options="[25, 50, 100]"
        data-key="productCode" striped-rows removable-sort table-style="min-width: 72rem"
      >
        <template #empty><div class="py-10 text-center text-surface-500">{{ loadError || 'ไม่พบ Product ตามเงื่อนไขที่เลือก' }}</div></template>
        <Column header="" style="width: 4rem">
          <template #body="slotProps"><Button icon="pi pi-eye" severity="secondary" text rounded aria-label="ดูรายละเอียดสินค้า" title="ดูรายละเอียด" @click="openProduct(slotProps.data)" /></template>
        </Column>
        <Column field="productCode" header="รหัสสินค้า" sortable style="width: 16rem" />
        <Column field="productName" header="ชื่อสินค้า" sortable />
        <Column field="categoryCode" header="หมวด" style="width: 7rem" />
        <Column header="Product Group" style="min-width: 13rem">
          <template #body="slotProps">
            <div v-if="groupNamesForProduct(slotProps.data.productCode).length" class="flex flex-wrap gap-1">
              <Tag v-for="name in groupNamesForProduct(slotProps.data.productCode)" :key="name" :value="name" severity="secondary" />
            </div>
            <span v-else class="text-surface-400">—</span>
          </template>
        </Column>
        <Column field="smallUnit" header="หน่วย" style="width: 7rem" />
        <Column header="เพิ่มเข้า Group" style="width: 12rem">
          <template #body="slotProps">
            <span v-if="isProductInSelectedGroup(slotProps.data.productCode)" class="inline-flex items-center gap-2 text-primary-600" title="สินค้านี้อยู่ใน Group ที่เลือกแล้ว">
              <i class="pi pi-check-circle text-lg" aria-hidden="true" />
              <span class="text-xs font-medium">อยู่ใน Group แล้ว</span>
            </span>
            <Button v-else label="Add to Group" icon="pi pi-plus" severity="secondary" size="small" outlined :loading="addingProductCode === slotProps.data.productCode" :disabled="!selectedGroupId || Boolean(addingProductCode)" @click="addToSelectedGroup(slotProps.data)" />
          </template>
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
import Message from 'primevue/message'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import { fetchProducts } from '../../../services/product-data.js'
import { addProductToGroup, fetchProductGroups } from '../../../services/product-group-data.js'

export default {
  name: 'ProductListView',
  components: { Button, Column, DataTable, IconField, InputIcon, InputText, Message, Select, SelectButton, Tag },
  data() {
    return {
      products: [], productGroups: [], isLoading: false, loadError: '', search: '', categoryFilter: 'ALL', productGroupFilter: 'ALL', statusFilter: 'ACTIVE',
      selectedGroupId: null, selectedGroupProductCodes: new Set(), addingProductCode: '', groupError: '', groupSuccess: '',
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
    productGroupOptions() {
      return [{ label: 'ทุก Product Group', value: 'ALL' }, ...this.productGroups.map((group) => ({ label: group.groupName, value: group.id }))]
    },
    targetGroupOptions() { return this.productGroups.map((group) => ({ label: `เพิ่มเข้า: ${group.groupName}`, value: group.id })) },
    groupNamesByProduct() {
      const names = new Map()
      this.productGroups.forEach((group) => group.productCodes.forEach((productCode) => {
        if (!names.has(productCode)) names.set(productCode, [])
        names.get(productCode).push(group.groupName)
      }))
      return names
    },
    filteredProducts() {
      const keyword = this.search.trim().toLocaleLowerCase('th-TH')
      return this.products.filter((product) => {
        const matchesStatus = this.statusFilter === 'ALL' || product.status === this.statusFilter
        const matchesCategory = this.categoryFilter === 'ALL' || product.categoryCode === this.categoryFilter
        const groupNames = this.groupNamesByProduct.get(product.productCode) || []
        const matchesProductGroup = this.productGroupFilter === 'ALL' || this.productGroups.some((group) => group.id === this.productGroupFilter && group.productCodes.includes(product.productCode))
        const searchable = [product.productCode, product.productName, ...groupNames].join(' ').toLocaleLowerCase('th-TH')
        return matchesStatus && matchesCategory && matchesProductGroup && (!keyword || searchable.includes(keyword))
      })
    }
  },
  watch: {
    selectedGroupId(value) {
      const group = this.productGroups.find((item) => item.id === value)
      this.selectedGroupProductCodes = new Set(group?.productCodes || [])
      this.groupError = ''
      this.groupSuccess = ''
    }
  },
  mounted() { this.loadProducts() },
  methods: {
    async loadProducts() {
      this.isLoading = true
      try { [this.products, this.productGroups] = await Promise.all([fetchProducts(), fetchProductGroups()]) } catch (error) {
        console.error('Unable to load Products', error)
        this.loadError = 'ไม่สามารถโหลดข้อมูล Product ได้'
      } finally { this.isLoading = false }
    },
    openImport() { this.$router.push({ name: 'product-import' }) },
    openProduct(product) { this.$router.push({ name: 'product-detail', params: { productCode: product.productCode } }) },
    isProductInSelectedGroup(productCode) { return Boolean(this.selectedGroupId) && this.selectedGroupProductCodes.has(productCode) },
    async addToSelectedGroup(product) {
      if (!this.selectedGroupId || !product || this.addingProductCode) return
      this.addingProductCode = product.productCode
      this.groupError = ''
      this.groupSuccess = ''
      try {
        await addProductToGroup(this.selectedGroupId, product.productCode)
        this.selectedGroupProductCodes = new Set([...this.selectedGroupProductCodes, product.productCode])
        this.productGroups = this.productGroups.map((group) => group.id === this.selectedGroupId
          ? { ...group, productCodes: [...group.productCodes, product.productCode], productCount: group.productCount + 1 }
          : group)
        const groupName = this.productGroups.find((group) => group.id === this.selectedGroupId)?.groupName || 'Product Group'
        this.groupSuccess = `เพิ่ม ${product.productCode} เข้า ${groupName} แล้ว`
      } catch (error) {
        console.error(error)
        this.groupError = 'ไม่สามารถเพิ่มสินค้าเข้า Product Group ได้'
      } finally { this.addingProductCode = '' }
    },
    groupNamesForProduct(productCode) { return this.groupNamesByProduct.get(productCode) || [] },
    formatDateTime(value) { return value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—' }
  }
}
</script>

<style scoped>
:deep(.p-datatable-tbody > tr > td) { user-select: text; }
</style>
