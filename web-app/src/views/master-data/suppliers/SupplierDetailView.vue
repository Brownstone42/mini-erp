<template>
  <section>
    <Button label="กลับไปหน้ารายการ" icon="pi pi-arrow-left" severity="secondary" text @click="goBack" />

    <div class="mt-4 flex items-start justify-between gap-6">
      <div>
        <p class="text-sm font-medium text-primary-600">{{ supplier?.supplierCode || supplierCode }}</p>
        <h2 class="mt-1 text-3xl font-semibold tracking-tight">{{ supplier?.supplierName || (isLoading ? 'กำลังโหลด...' : 'ไม่พบข้อมูล Supplier') }}</h2>
        <p class="mt-2 text-sm text-surface-500">ข้อมูลจาก Express · อ่านอย่างเดียว</p>
      </div>
      <Tag v-if="supplier" :value="supplier.status === 'ACTIVE' ? 'ใช้งาน' : 'ไม่ใช้งาน'" :severity="supplier.status === 'ACTIVE' ? 'success' : 'secondary'" />
    </div>

    <Message v-if="loadError" severity="error" class="mt-6">{{ loadError }}</Message>

    <div v-if="supplier" class="mt-8 grid gap-6 lg:grid-cols-2">
      <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h3 class="font-semibold">ข้อมูลทั่วไป</h3>
        <dl class="mt-5 grid grid-cols-[10rem_1fr] gap-x-4 gap-y-4 text-sm">
          <dt class="text-surface-500">ประเภท</dt><dd>{{ supplier.supplierType }}</dd>
          <dt class="text-surface-500">เลขผู้เสียภาษี</dt><dd>{{ supplier.taxId || '—' }}</dd>
          <dt class="text-surface-500">สาขา</dt><dd>{{ supplier.branch || '—' }}</dd>
          <dt class="text-surface-500">เลขที่บัญชี Express</dt><dd>{{ supplier.expressAccountCode || '—' }}</dd>
        </dl>
      </section>

      <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h3 class="font-semibold">การติดต่อ</h3>
        <dl class="mt-5 grid grid-cols-[10rem_1fr] gap-x-4 gap-y-4 text-sm">
          <dt class="text-surface-500">เบอร์โทรศัพท์</dt><dd>{{ supplier.phone || '—' }}</dd>
          <dt class="text-surface-500">ผู้ติดต่อ</dt><dd>{{ supplier.contactName || '—' }}</dd>
          <dt class="text-surface-500">Email</dt><dd>{{ supplier.email || '—' }}</dd>
          <dt class="text-surface-500">ที่อยู่</dt><dd>{{ supplier.address || '—' }}</dd>
        </dl>
      </section>

      <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h3 class="font-semibold">เงื่อนไขเครดิต</h3>
        <dl class="mt-5 grid grid-cols-[10rem_1fr] gap-x-4 gap-y-4 text-sm">
          <dt class="text-surface-500">เครดิต</dt><dd>{{ supplier.creditDays }} วัน</dd>
          <dt class="text-surface-500">ยอดวงเงิน</dt><dd>{{ supplier.creditLimit }}</dd>
          <dt class="text-surface-500">อัปเดตล่าสุด</dt><dd>{{ supplier.updatedAt }}</dd>
        </dl>
      </section>
    </div>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'

import { fetchSupplier } from '../../../services/supplier-data.js'

export default {
  name: 'SupplierDetailView',
  components: {
    Button,
    Message,
    Tag
  },
  props: {
    supplierCode: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      supplier: null,
      isLoading: false,
      loadError: ''
    }
  },
  mounted() {
    this.loadSupplier()
  },
  methods: {
    async loadSupplier() {
      this.isLoading = true
      this.loadError = ''
      try {
        this.supplier = await fetchSupplier(this.supplierCode)
        if (!this.supplier) this.loadError = 'ไม่พบข้อมูล Supplier'
      } catch (error) {
        console.error('Unable to load supplier', error)
        this.loadError = 'ไม่สามารถโหลดข้อมูล Supplier ได้'
      } finally {
        this.isLoading = false
      }
    },
    goBack() {
      this.$router.push({ name: 'supplier-list' })
    }
  }
}
</script>

<style scoped>
</style>
