<template>
  <section>
    <div>
      <p class="text-sm font-medium text-primary-600">Master Data</p>
      <h2 class="mt-1 text-3xl font-semibold tracking-tight">Product Category</h2>
      <p class="mt-2 text-sm text-surface-500">หมวดสินค้าจาก Express · อ่านอย่างเดียว</p>
    </div>
    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">หมวดสินค้าทั้งหมด</p><p class="mt-2 text-3xl font-semibold">{{ categories.length.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">หมวด</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">ใช้งาน</p><p class="mt-2 text-3xl font-semibold text-primary-600">{{ activeCount.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">หมวด</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">ไม่ใช้งาน</p><p class="mt-2 text-3xl font-semibold text-surface-500">{{ inactiveCount.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">หมวด</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">อัปเดตล่าสุด</p><p class="mt-2 text-lg font-semibold">{{ formatDateTime(latestUpdatedAt) }}</p></div>
    </div>
    <div class="mt-8 rounded-xl border border-surface-200 bg-white shadow-sm">
      <DataTable :value="categories" :loading="isLoading" data-key="categoryCode" striped-rows @row-click="openCategory">
        <template #empty><div class="py-10 text-center text-surface-500">{{ loadError || 'ไม่พบ Product Category' }}</div></template>
        <Column field="categoryCode" header="รหัสหมวด" sortable style="width: 12rem" />
        <Column field="categoryName" header="ชื่อหมวด" sortable />
        <Column header="สถานะ" style="width: 10rem">
          <template #body="slotProps"><Tag :value="slotProps.data.status === 'ACTIVE' ? 'ใช้งาน' : 'ไม่ใช้งาน'" :severity="slotProps.data.status === 'ACTIVE' ? 'success' : 'secondary'" /></template>
        </Column>
      </DataTable>
    </div>
  </section>
</template>

<script>
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import { fetchProductCategories } from '../../../services/product-data.js'
export default {
  name: 'ProductCategoryListView', components: { Column, DataTable, Tag },
  data() { return { categories: [], isLoading: false, loadError: '' } },
  computed: {
    activeCount() { return this.categories.filter((category) => category.status === 'ACTIVE').length },
    inactiveCount() { return this.categories.length - this.activeCount },
    latestUpdatedAt() { return this.categories.reduce((latest, category) => !latest || category.updatedAtRaw > latest ? category.updatedAtRaw : latest, null) }
  },
  mounted() { this.loadCategories() },
  methods: {
    async loadCategories() {
      this.isLoading = true
      try { this.categories = await fetchProductCategories() } catch (error) {
        console.error('Unable to load Product Categories', error)
        this.loadError = 'ไม่สามารถโหลด Product Category ได้'
      } finally { this.isLoading = false }
    },
    openCategory(event) { this.$router.push({ name: 'product-category-detail', params: { categoryCode: event.data.categoryCode } }) },
    formatDateTime(value) { return value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—' }
  }
}
</script>

<style scoped>:deep(.p-datatable-tbody > tr) { cursor: pointer; }</style>
