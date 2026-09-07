<template>
  <section>
    <Button label="กลับไปหน้าหมวดสินค้า" icon="pi pi-arrow-left" severity="secondary" text @click="goBack" />
    <div class="mt-4 flex items-start justify-between gap-6">
      <div>
        <p class="text-sm font-medium text-primary-600">{{ category?.categoryCode || categoryCode }}</p>
        <h2 class="mt-1 text-3xl font-semibold tracking-tight">{{ category?.categoryName || (isLoading ? 'กำลังโหลด...' : 'ไม่พบหมวดสินค้า') }}</h2>
        <p v-if="category" class="mt-2 text-sm text-surface-500">สินค้าในหมวด {{ category.products.length }} รายการ</p>
      </div>
      <Tag v-if="category" :value="category.status === 'ACTIVE' ? 'ใช้งาน' : 'ไม่ใช้งาน'" :severity="category.status === 'ACTIVE' ? 'success' : 'secondary'" />
    </div>
    <Message v-if="loadError" severity="error" class="mt-6">{{ loadError }}</Message>
    <div v-if="category" class="mt-8 rounded-xl border border-surface-200 bg-white shadow-sm">
      <DataTable :value="category.products" paginator :rows="25" :rows-per-page-options="[25, 50, 100]" data-key="productCode" striped-rows @row-click="openProduct">
        <template #empty><div class="py-10 text-center text-surface-500">ไม่มีสินค้าในหมวดนี้</div></template>
        <Column field="productCode" header="รหัสสินค้า" sortable style="width: 16rem" />
        <Column field="productName" header="ชื่อสินค้า" sortable />
        <Column field="smallUnit" header="หน่วย" style="width: 8rem" />
        <Column header="สถานะ" style="width: 10rem">
          <template #body="slotProps"><Tag :value="slotProps.data.status === 'ACTIVE' ? 'ใช้งาน' : 'ไม่ใช้งาน'" :severity="slotProps.data.status === 'ACTIVE' ? 'success' : 'secondary'" /></template>
        </Column>
      </DataTable>
    </div>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { fetchProductCategory } from '../../../services/product-data.js'
export default {
  name: 'ProductCategoryDetailView', components: { Button, Column, DataTable, Message, Tag },
  props: { categoryCode: { type: String, required: true } },
  data() { return { category: null, isLoading: false, loadError: '' } },
  mounted() { this.loadCategory() },
  methods: {
    async loadCategory() {
      this.isLoading = true
      try {
        this.category = await fetchProductCategory(this.categoryCode)
        if (!this.category) this.loadError = 'ไม่พบ Product Category'
      } catch (error) {
        console.error('Unable to load Product Category', error)
        this.loadError = 'ไม่สามารถโหลด Product Category ได้'
      } finally { this.isLoading = false }
    },
    goBack() { this.$router.push({ name: 'product-category-list' }) },
    openProduct(event) { this.$router.push({ name: 'product-detail', params: { productCode: event.data.productCode } }) }
  }
}
</script>

<style scoped>:deep(.p-datatable-tbody > tr) { cursor: pointer; }</style>
