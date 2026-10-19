<template>
  <section>
    <p class="text-sm font-medium text-primary-600">Company Mode</p>
    <h2 class="mt-1 text-3xl font-semibold tracking-tight">Goodbooch</h2>
    <p class="mt-3 max-w-2xl text-surface-600">พื้นที่ทำงานของบริษัท Goodbooch แยกข้อมูลออกจาก Ideal Globe โดยสมบูรณ์</p>

    <div class="mt-8 max-w-3xl rounded-xl border border-blue-200 bg-blue-50 p-6">
      <div class="flex items-start gap-4">
        <i class="pi pi-database mt-1 text-2xl text-blue-600" />
        <div>
          <h3 class="font-semibold text-blue-950">Product Master พร้อมเริ่มกรอกข้อมูล</h3>
          <p class="mt-2 text-sm leading-6 text-blue-800">เริ่มจากกำหนด SKU กลางให้ตรงกับ Shopee พร้อมเลือกว่าสินค้าแต่ละรายการตัดสต็อกโดยตรงหรือเป็นสินค้า Repack</p>
          <p class="mt-3 text-xs text-blue-700">เป้าหมายฐานข้อมูล: <code>goodboocherp</code></p>
          <Button label="เปิด Product Master" icon="pi pi-arrow-right" icon-pos="right" class="mt-5" @click="$router.push({ name: 'goodbooch-product-list' })" />
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import Button from 'primevue/button'

export default {
  name: 'CompanyWorkspaceView',
  components: { Button }
}
</script>
