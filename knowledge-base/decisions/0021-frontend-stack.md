# Decision 0021: Frontend Stack

วันที่: 2026-08-06  
สถานะ: ยืนยันแล้ว

## การตัดสินใจ

Frontend ของ ERP ใช้:

- Vue 3
- Vite
- JavaScript
- Vue Options API
- Vue Router
- Pinia
- PrimeVue 4
- Tailwind CSS 4
- `tailwindcss-primeui` สำหรับเชื่อม design tokens ระหว่าง PrimeVue และ Tailwind

## รูปแบบ Vue Component

ใช้ Single File Component ตามลำดับ:

```vue
<template>
</template>

<script>
export default {
  name: 'ComponentName',
  data() {
    return {}
  },
  computed: {},
  mounted() {},
  methods: {}
}
</script>

<style scoped>
</style>
```

## ข้อกำหนด

- ห้ามใช้ `<script setup>`
- ห้ามใช้ Composition API เช่น `ref()`, `reactive()` และ `setup()` ใน application components
- ไม่ใช้ TypeScript
- ใช้ไฟล์ `.js` และ Vue SFC ที่เป็น JavaScript
- ใช้ Pinia สำหรับ shared application state และไม่ย้าย local component state เข้า store โดยไม่จำเป็น

## การแบ่งหน้าที่ PrimeVue และ Tailwind

- PrimeVue ใช้กับ component ที่มีพฤติกรรมซับซ้อน เช่น DataTable, Dialog, Select, File Upload, Toast และ Pagination
- เริ่มด้วย PrimeVue styled mode และ theme preset `Aura`
- Tailwind ใช้สำหรับ layout, spacing, responsive design และ utility styling
- ใช้ `tailwindcss-primeui` เพื่อให้ Tailwind ใช้ semantic colors และ design tokens ชุดเดียวกับ PrimeVue
- ยังไม่ใช้ PrimeVue unstyled mode หรือ Volt ใน Phase แรก เพื่อลดภาระการสร้าง component styling เอง

## สิ่งที่ไม่ใช้

- Nuxt
- Nuxt Server/Nitro
- TypeScript
- Prisma ORM
- Sass/Less/Stylus

## Hosting และ Backend ที่ใช้ร่วมกัน

- Firebase Hosting
- Firebase Authentication
- Cloud Functions for Firebase Gen 2
- Firebase SQL Connect และ Cloud SQL for PostgreSQL

## เหตุผล

Stack นี้ตรงกับความถนัดของเจ้าของระบบ ใช้รูปแบบ Vue ดั้งเดิมที่อ่านและแก้ไขได้สะดวก ขณะเดียวกัน PrimeVue ลดเวลาพัฒนา component สำหรับงาน ERP และ Tailwind ช่วยควบคุมหน้าตาโดยรวมได้รวดเร็ว
