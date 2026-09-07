<template>
  <section>
    <Button label="กลับไปหน้ารายการ" icon="pi pi-arrow-left" severity="secondary" text @click="goBack" />

    <div class="mt-4 flex items-start justify-between gap-6">
      <div>
        <p class="text-sm font-medium text-primary-600">{{ customer?.customerCode || customerCode }}</p>
        <h2 class="mt-1 text-3xl font-semibold tracking-tight">
          {{ customer?.customerName || (isLoading ? 'กำลังโหลด...' : 'ไม่พบข้อมูล Customer') }}
        </h2>
        <p class="mt-2 text-sm text-surface-500">ข้อมูลจาก Express · อ่านอย่างเดียว</p>
      </div>
      <Tag
        v-if="customer"
        :value="customer.status === 'ACTIVE' ? 'ใช้งาน' : 'ไม่ใช้งาน'"
        :severity="customer.status === 'ACTIVE' ? 'success' : 'secondary'"
      />
    </div>

    <Message v-if="loadError" severity="error" class="mt-6">{{ loadError }}</Message>

    <div v-if="customer" class="mt-8 grid gap-6 lg:grid-cols-2">
      <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h3 class="font-semibold">ข้อมูลทั่วไป</h3>
        <dl class="mt-5 grid grid-cols-[10rem_1fr] gap-x-4 gap-y-4 text-sm">
          <dt class="text-surface-500">ประเภท</dt><dd>{{ show(customer.customerType) }}</dd>
          <dt class="text-surface-500">เลขผู้เสียภาษี</dt><dd>{{ show(customer.taxId) }}</dd>
          <dt class="text-surface-500">สาขา</dt><dd>{{ show(customer.branch) }}</dd>
          <dt class="text-surface-500">เลขที่บัญชี Express</dt><dd>{{ show(customer.expressAccountCode) }}</dd>
          <dt class="text-surface-500">ประเภทราคา</dt><dd>{{ show(customer.priceType) }}</dd>
        </dl>
      </section>

      <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h3 class="font-semibold">การติดต่อ</h3>
        <dl class="mt-5 grid grid-cols-[10rem_1fr] gap-x-4 gap-y-4 text-sm">
          <dt class="text-surface-500">ผู้ติดต่อ</dt><dd>{{ show(customer.contactName) }}</dd>
          <dt class="text-surface-500">เบอร์โทรศัพท์</dt><dd>{{ show(customer.phone) }}</dd>
          <dt class="text-surface-500">Email</dt><dd>{{ show(customer.email) }}</dd>
          <dt class="text-surface-500">ที่อยู่</dt><dd class="whitespace-pre-wrap">{{ show(customer.address) }}</dd>
          <dt class="text-surface-500">รหัสไปรษณีย์</dt><dd>{{ show(customer.postalCode) }}</dd>
        </dl>
      </section>

      <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h3 class="font-semibold">ฝ่ายขายและการจัดส่ง</h3>
        <dl class="mt-5 grid grid-cols-[10rem_1fr] gap-x-4 gap-y-4 text-sm">
          <dt class="text-surface-500">พนักงานขาย</dt><dd>{{ show(customer.salespersonCode) }}</dd>
          <dt class="text-surface-500">เขตการขาย</dt><dd>{{ show(customer.salesTerritory) }}</dd>
          <dt class="text-surface-500">ขนส่งโดย</dt><dd>{{ show(customer.shippingMethod) }}</dd>
        </dl>
      </section>

      <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h3 class="font-semibold">เงื่อนไขเครดิต</h3>
        <dl class="mt-5 grid grid-cols-[10rem_1fr] gap-x-4 gap-y-4 text-sm">
          <dt class="text-surface-500">เครดิต</dt><dd>{{ customer.creditDays ?? '—' }}{{ customer.creditDays == null ? '' : ' วัน' }}</dd>
          <dt class="text-surface-500">วงเงิน</dt><dd>{{ formatMoney(customer.creditLimit) }}</dd>
          <dt class="text-surface-500">เงื่อนไขชำระเงิน</dt><dd>{{ show(customer.paymentTerms) }}</dd>
        </dl>
      </section>

      <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h3 class="font-semibold">หมายเหตุและข้อมูลระบบ</h3>
        <dl class="mt-5 grid grid-cols-[10rem_1fr] gap-x-4 gap-y-4 text-sm">
          <dt class="text-surface-500">หมายเหตุ</dt><dd class="whitespace-pre-wrap">{{ show(customer.noteText) }}</dd>
          <dt class="text-surface-500">อัปเดตล่าสุด</dt><dd>{{ customer.updatedAt }}</dd>
          <dt class="text-surface-500">สร้างเมื่อ</dt><dd>{{ customer.createdAt }}</dd>
        </dl>
      </section>
    </div>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { fetchCustomer } from '../../../services/customer-data.js'

export default {
  name: 'CustomerDetailView',
  components: { Button, Message, Tag },
  props: {
    customerCode: { type: String, required: true }
  },
  data() {
    return { customer: null, isLoading: false, loadError: '' }
  },
  mounted() {
    this.loadCustomer()
  },
  methods: {
    async loadCustomer() {
      this.isLoading = true
      this.loadError = ''
      try {
        this.customer = await fetchCustomer(this.customerCode)
        if (!this.customer) this.loadError = 'ไม่พบข้อมูล Customer'
      } catch (error) {
        console.error('Unable to load customer', error)
        this.loadError = 'ไม่สามารถโหลดข้อมูล Customer ได้'
      } finally {
        this.isLoading = false
      }
    },
    goBack() {
      this.$router.push({ name: 'customer-list' })
    },
    show(value) {
      return value || '—'
    },
    formatMoney(value) {
      if (value == null) return '—'
      return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
    }
  }
}
</script>

<style scoped></style>
