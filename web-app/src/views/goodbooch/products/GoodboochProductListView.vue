<template>
  <section>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-primary-600">Goodbooch · Master Data</p>
        <h2 class="mt-1 text-3xl font-semibold tracking-tight">Product Master</h2>
        <p class="mt-2 text-sm text-surface-500">รหัส SKU หลักของ Goodbooch และ Cleanshield ต้องตรงกับ SKU ที่ใช้บน Shopee</p>
      </div>
      <Button label="เพิ่มสินค้า" icon="pi pi-plus" @click="$router.push({ name: 'goodbooch-product-create' })" />
    </div>

    <Message v-if="error" severity="error" class="mt-5">{{ error }}</Message>

    <div class="mt-6 grid gap-4 sm:grid-cols-3">
      <div class="summary-card"><span>สินค้าทั้งหมด</span><strong>{{ products.length.toLocaleString('th-TH') }}</strong></div>
      <div class="summary-card"><span>ตัดสต็อกอัตโนมัติ</span><strong>{{ directCount.toLocaleString('th-TH') }}</strong></div>
      <div class="summary-card"><span>สินค้า Repack</span><strong>{{ repackCount.toLocaleString('th-TH') }}</strong></div>
    </div>

    <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-semibold">รายการสินค้า</h3>
          <p class="mt-1 text-sm text-surface-500">กดปุ่มดินสอเพื่อแก้ไขสินค้า หรือปุ่มคัดลอกเพื่อสร้างสินค้าใหม่จากข้อมูลเดิม</p>
        </div>
        <IconField class="w-full sm:w-80">
          <InputIcon class="pi pi-search" />
          <InputText v-model="searchText" class="w-full" placeholder="ค้นหา SKU หรือชื่อสินค้า" />
        </IconField>
      </div>

      <DataTable
        :value="filteredProducts"
        :loading="loading"
        data-key="sku"
        striped-rows
        paginator
        :rows="25"
        :rows-per-page-options="[25, 50, 100]"
        table-style="width: 100%; table-layout: fixed"
        class="product-table"
      >
        <template #empty>ยังไม่มีสินค้า Goodbooch</template>
        <Column field="sku" header="SKU" sortable style="width: 17%"><template #body="p"><span class="break-words font-medium text-surface-900">{{ p.data.sku }}</span></template></Column>
        <Column field="productName" header="ชื่อสินค้า" sortable style="width: 25%"><template #body="p"><span class="break-words">{{ p.data.productName }}</span></template></Column>
        <Column field="inventoryMethod" header="วิธีสต็อก" sortable style="width: 15%"><template #body="p"><Tag :value="tableMethodLabel(p.data.inventoryMethod)" :severity="p.data.inventoryMethod === 'DIRECT' ? 'success' : 'warn'" /></template></Column>
        <Column field="baseUnit" header="หน่วย" sortable style="width: 9%" />
        <Column field="lowStockThreshold" header="แจ้งเตือน" sortable style="width: 11%"><template #body="p">{{ Number(p.data.lowStockThreshold).toLocaleString('th-TH') }}</template></Column>
        <Column field="isActive" header="สถานะ" sortable style="width: 12%"><template #body="p"><Tag :value="p.data.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน'" :severity="p.data.isActive ? 'success' : 'secondary'" /></template></Column>
        <Column header="จัดการ" style="width: 11%">
          <template #body="p">
            <div class="flex items-center gap-1">
              <Button icon="pi pi-pencil" severity="primary" text rounded size="small" aria-label="แก้ไขสินค้า" title="แก้ไขสินค้า" @click="editProduct(p.data)" />
              <Button icon="pi pi-copy" severity="secondary" text rounded size="small" aria-label="คัดลอกสินค้า" title="คัดลอกสินค้า" @click="copyProduct(p.data)" />
            </div>
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
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { fetchGoodboochProducts, inventoryMethodLabel } from '../../../services/goodbooch-product-data.js'

export default {
  name: 'GoodboochProductListView',
  components: { Button, Column, DataTable, IconField, InputIcon, InputText, Message, Tag },
  data() {
    return { products: [], searchText: '', loading: true, error: '' }
  },
  computed: {
    filteredProducts() {
      const keyword = this.searchText.trim().toLocaleLowerCase('th-TH')
      if (!keyword) return this.products
      return this.products.filter((product) => [product.sku, product.productName, product.idealGlobeProductCode]
        .some((value) => String(value || '').toLocaleLowerCase('th-TH').includes(keyword)))
    },
    directCount() { return this.products.filter((product) => product.inventoryMethod === 'DIRECT').length },
    repackCount() { return this.products.filter((product) => product.inventoryMethod === 'VARIABLE_REPACK').length }
  },
  async activated() { await this.loadProducts() },
  methods: {
    methodLabel: inventoryMethodLabel,
    tableMethodLabel(value) { return value === 'DIRECT' ? 'ตัดสต็อก' : value === 'VARIABLE_REPACK' ? 'Repack' : inventoryMethodLabel(value) },
    async loadProducts() {
      this.loading = true
      this.error = ''
      try { this.products = await fetchGoodboochProducts() }
      catch (error) {
        console.error(error)
        this.error = 'ไม่สามารถโหลด Product Master ของ Goodbooch ได้ กรุณาตรวจสอบว่า Deploy ฐานข้อมูล Goodbooch แล้ว'
      } finally { this.loading = false }
    },
    editProduct(product) { this.$router.push({ name: 'goodbooch-product-edit', params: { sku: product.sku } }) },
    copyProduct(product) { this.$router.push({ name: 'goodbooch-product-create', query: { copyFrom: product.sku } }) }
  }
}
</script>

<style scoped>
.summary-card { display: flex; min-height: 104px; flex-direction: column; justify-content: space-between; border: 1px solid var(--p-surface-200); border-radius: .75rem; background: white; padding: 1.1rem; box-shadow: 0 1px 2px rgb(0 0 0 / .04); }
.summary-card span { font-size: .875rem; color: var(--p-surface-500); }
.summary-card strong { font-size: 1.75rem; font-weight: 600; }
:deep(.product-table .p-datatable-thead > tr > th),
:deep(.product-table .p-datatable-tbody > tr > td) { padding-left: .65rem; padding-right: .65rem; }
</style>
