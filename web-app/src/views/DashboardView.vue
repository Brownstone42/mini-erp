<template>
  <section>
    <p class="text-sm font-medium text-primary-600">ภาพรวม</p>
    <h2 class="mt-1 text-3xl font-semibold tracking-tight">ยินดีต้อนรับสู่ Mini ERP</h2>
    <p class="mt-3 max-w-2xl text-surface-600">
      ระบบอยู่ระหว่างการพัฒนา โดยเริ่มจาก Supplier Master Data และการนำเข้าข้อมูลจาก Express
    </p>

    <div class="mt-8 grid max-w-4xl gap-4 md:grid-cols-3">
      <article class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-surface-500">Supplier ทั้งหมด</p>
        <p class="mt-3 text-3xl font-semibold">954</p>
        <p class="mt-2 text-xs text-surface-400">ข้อมูลตัวอย่างจาก Express</p>
      </article>
      <article class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-surface-500">ใช้งาน</p>
        <p class="mt-3 text-3xl font-semibold text-emerald-600">954</p>
        <p class="mt-2 text-xs text-surface-400">รอเชื่อม Firebase SQL Connect</p>
      </article>
      <article class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-surface-500">Import ล่าสุด</p>
        <p class="mt-3 text-lg font-semibold">ยังไม่มีข้อมูล</p>
        <p class="mt-2 text-xs text-surface-400">ระบบยังไม่เชื่อม Production</p>
      </article>
    </div>
  </section>
</template>

<script>
export default {
  name: 'DashboardView'
}
</script>

<style scoped>
</style>
