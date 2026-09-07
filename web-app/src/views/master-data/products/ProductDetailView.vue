<template>
  <section>
    <Button label="กลับไปหน้ารายการ" icon="pi pi-arrow-left" severity="secondary" text @click="goBack" />
    <div class="mt-4 flex items-start justify-between gap-6">
      <div>
        <p class="text-sm font-medium text-primary-600">{{ product?.productCode || productCode }}</p>
        <h2 class="mt-1 text-3xl font-semibold tracking-tight">{{ product?.productName || (isLoading ? 'กำลังโหลด...' : 'ไม่พบข้อมูล Product') }}</h2>
        <p class="mt-2 text-sm text-surface-500">ข้อมูลจาก Express · อ่านอย่างเดียว</p>
      </div>
      <Tag v-if="product" :value="product.status === 'ACTIVE' ? 'ใช้งาน' : 'ไม่ใช้งาน'" :severity="product.status === 'ACTIVE' ? 'success' : 'secondary'" />
    </div>
    <Message v-if="loadError" severity="error" class="mt-6">{{ loadError }}</Message>

    <div v-if="product" class="mt-8 grid gap-6 lg:grid-cols-2">
      <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h3 class="font-semibold">ข้อมูลทั่วไป</h3>
        <dl class="mt-5 grid grid-cols-[11rem_1fr] gap-x-4 gap-y-4 text-sm">
          <dt class="text-surface-500">หมวดสินค้า</dt><dd>{{ product.categoryCode }} — {{ product.categoryName }}</dd>
          <dt class="text-surface-500">รายละเอียดหน่วยใหญ่</dt><dd>{{ show(product.largeDescription) }}</dd>
          <dt class="text-surface-500">รหัสบัญชี</dt><dd>{{ show(product.accountCode) }}</dd>
          <dt class="text-surface-500">ราคามาตรฐาน</dt><dd>{{ formatMoney(product.standardPrice) }}</dd>
          <dt class="text-surface-500">สินค้าทดแทน</dt><dd>{{ show(product.replacementText) }}</dd>
        </dl>
      </section>
      <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h3 class="font-semibold">ผู้จัดจำหน่าย</h3>
        <dl class="mt-5 grid grid-cols-[11rem_1fr] gap-x-4 gap-y-4 text-sm">
          <dt class="text-surface-500">รหัส Supplier</dt><dd>{{ show(product.supplierCode) }}</dd>
          <dt class="text-surface-500">ชื่อ Supplier</dt><dd>{{ show(product.supplierName) }}</dd>
        </dl>
      </section>
      <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h3 class="font-semibold">หน่วยสินค้า</h3>
        <div class="mt-5 grid gap-4 md:grid-cols-4">
          <div v-for="unit in units" :key="unit.label" class="rounded-lg bg-surface-50 p-4">
            <p class="text-xs text-surface-500">{{ unit.label }}</p>
            <p class="mt-1 font-medium">{{ unit.value }}</p>
            <p v-if="unit.factor" class="mt-1 text-xs text-surface-500">ตัวคูณ {{ unit.factor }}</p>
          </div>
        </div>
      </section>
      <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h3 class="font-semibold">ข้อมูลระบบ</h3>
        <dl class="mt-5 grid grid-cols-[11rem_1fr] gap-x-4 gap-y-4 text-sm">
          <dt class="text-surface-500">อัปเดตล่าสุด</dt><dd>{{ product.updatedAt }}</dd>
          <dt class="text-surface-500">สร้างเมื่อ</dt><dd>{{ product.createdAt }}</dd>
        </dl>
      </section>
    </div>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { fetchProduct } from '../../../services/product-data.js'

export default {
  name: 'ProductDetailView', components: { Button, Message, Tag },
  props: { productCode: { type: String, required: true } },
  data() { return { product: null, isLoading: false, loadError: '' } },
  computed: {
    units() {
      if (!this.product) return []
      return [
        { label: 'หน่วยย่อย', value: this.show(this.product.smallUnit) },
        { label: 'หน่วยใหญ่', value: this.show(this.product.largeUnit) },
        { label: 'หน่วยซื้อ', value: this.show(this.product.purchaseUnit), factor: this.product.purchaseFactor },
        { label: 'หน่วยขาย', value: this.show(this.product.salesUnit), factor: this.product.salesFactor }
      ]
    }
  },
  mounted() { this.loadProduct() },
  methods: {
    async loadProduct() {
      this.isLoading = true
      try {
        this.product = await fetchProduct(this.productCode)
        if (!this.product) this.loadError = 'ไม่พบข้อมูล Product'
      } catch (error) {
        console.error('Unable to load Product', error)
        this.loadError = 'ไม่สามารถโหลดข้อมูล Product ได้'
      } finally { this.isLoading = false }
    },
    goBack() { this.$router.push({ name: 'product-list' }) },
    show(value) { return value || '—' },
    formatMoney(value) { return value == null ? '—' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(value) }
  }
}
</script>

<style scoped></style>
