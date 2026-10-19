<template>
  <section class="mx-auto max-w-4xl">
    <Button label="กลับไป Product Master" icon="pi pi-arrow-left" severity="secondary" text class="mb-4" @click="$router.push({ name: 'goodbooch-product-list' })" />

    <div>
      <p class="text-sm font-medium text-primary-600">Goodbooch · Product Master</p>
      <h2 class="mt-1 text-3xl font-semibold tracking-tight">{{ isEditing ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า' }}</h2>
      <p class="mt-2 text-sm text-surface-500">SKU จะเป็นรหัสกลางสำหรับ Goodbooch, Cleanshield และ Shopee</p>
    </div>

    <Message v-if="error" severity="error" class="mt-5">{{ error }}</Message>
    <Message v-if="copyMessage" severity="info" class="mt-5">{{ copyMessage }}</Message>

    <section class="mt-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
      <div v-if="loading" class="flex min-h-56 items-center justify-center gap-3 text-surface-500"><i class="pi pi-spin pi-spinner" /> กำลังโหลดข้อมูล</div>
      <form v-else class="space-y-5" @submit.prevent="save">
        <div class="grid gap-5 md:grid-cols-2">
          <label class="block">
            <span class="field-label">SKU *</span>
            <InputText v-model="form.sku" class="w-full" :disabled="skuLocked" maxlength="100" autocomplete="off" />
            <small class="mt-1.5 block text-surface-500">กรอกให้ตรงกับ SKU บน Shopee ตัวอักษรเล็ก-ใหญ่ถือเป็นรหัสตามที่กรอก</small>
            <small v-if="skuLocked" class="mt-1.5 block font-medium text-amber-700">SKU นี้มีประวัติสต็อกหรือ Shopee Mapping แล้ว จึงล็อกรหัสไว้เพื่อไม่ให้ข้อมูลขาดจากสินค้า</small>
            <small v-if="isRenaming" class="mt-1.5 block font-medium text-amber-700">รหัสเดิม {{ originalSku }} จะถูกเปลี่ยนเป็น {{ form.sku.trim() }}</small>
          </label>
          <label class="block">
            <span class="field-label">ชื่อสินค้า *</span>
            <InputText v-model="form.productName" class="w-full" maxlength="250" autocomplete="off" />
          </label>
        </div>

        <div class="grid gap-5 md:grid-cols-2">
          <label class="block">
            <span class="field-label">วิธีจัดการสต็อก *</span>
            <Select v-model="form.inventoryMethod" :options="inventoryMethods" option-label="label" option-value="value" class="w-full" />
          </label>
          <label class="block">
            <span class="field-label">หน่วยหลัก *</span>
            <InputText v-model="form.baseUnit" class="w-full" maxlength="50" placeholder="เช่น คู่, ชิ้น, ห่อ" autocomplete="off" />
          </label>
        </div>

        <div class="rounded-lg border p-4" :class="form.inventoryMethod === 'DIRECT' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'">
          <p class="font-medium" :class="form.inventoryMethod === 'DIRECT' ? 'text-green-900' : 'text-amber-900'">{{ selectedMethodTitle }}</p>
          <p class="mt-1 text-sm leading-6" :class="form.inventoryMethod === 'DIRECT' ? 'text-green-800' : 'text-amber-800'">{{ selectedMethodDescription }}</p>
        </div>

        <div class="grid gap-5 md:grid-cols-2">
          <label class="block">
            <span class="field-label">แจ้งเตือนเมื่อเหลือต่ำกว่า</span>
            <InputNumber v-model="form.lowStockThreshold" class="w-full" input-class="w-full" :min="0" :max-fraction-digits="0" show-buttons />
          </label>
          <label class="block">
            <span class="field-label">รหัสสินค้า Ideal Globe (อ้างอิง)</span>
            <InputText v-model="form.idealGlobeProductCode" class="w-full" maxlength="100" autocomplete="off" />
          </label>
        </div>

        <label class="block">
          <span class="field-label">หมายเหตุ</span>
          <Textarea v-model="form.noteText" class="w-full" rows="4" maxlength="1000" auto-resize />
        </label>

        <label v-if="isEditing" class="flex items-center gap-3 rounded-lg border border-surface-200 p-4">
          <Checkbox v-model="form.isActive" binary input-id="product-active" />
          <span><span class="block font-medium">เปิดใช้งานสินค้า</span><small class="text-surface-500">เอาเครื่องหมายออกเมื่อต้องการหยุดใช้ SKU นี้ โดยข้อมูลเดิมยังคงอยู่</small></span>
        </label>

        <div class="flex justify-end gap-3 border-t border-surface-200 pt-5">
          <Button type="button" label="ยกเลิก" severity="secondary" outlined @click="$router.push({ name: 'goodbooch-product-list' })" />
          <Button type="submit" :label="isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'" icon="pi pi-save" :loading="saving" :disabled="!canSave" />
        </div>
      </form>
    </section>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import { createGoodboochProduct, fetchGoodboochProduct, GOODBOOCH_INVENTORY_METHODS, renameGoodboochProduct, updateGoodboochProduct } from '../../../services/goodbooch-product-data.js'
import { fetchGoodboochSalesSkuMappings } from '../../../services/goodbooch-sales-sku-mapping-data.js'
import { fetchGoodboochStockTransactions } from '../../../services/goodbooch-stock-data.js'

function emptyForm() {
  return { sku: '', productName: '', inventoryMethod: 'DIRECT', baseUnit: '', lowStockThreshold: 0, idealGlobeProductCode: '', noteText: '', isActive: true }
}

export default {
  name: 'GoodboochProductFormView',
  components: { Button, Checkbox, InputNumber, InputText, Message, Select, Textarea },
  props: { sku: { type: String, default: '' } },
  data() {
    return { form: emptyForm(), originalSku: this.sku, skuLocked: false, inventoryMethods: GOODBOOCH_INVENTORY_METHODS, loading: Boolean(this.sku || this.$route.query.copyFrom), saving: false, error: '', copyMessage: '' }
  },
  computed: {
    isEditing() { return Boolean(this.sku) },
    isRenaming() { return this.isEditing && this.form.sku.trim() !== this.originalSku },
    canSave() { return Boolean(this.form.sku.trim() && this.form.productName.trim() && this.form.inventoryMethod && this.form.baseUnit.trim()) && !this.saving },
    selectedMethodTitle() { return this.form.inventoryMethod === 'DIRECT' ? 'ตัดสต็อกอัตโนมัติ' : 'ติดตามเฉพาะวัตถุดิบ/ห่อใหญ่' },
    selectedMethodDescription() {
      return this.form.inventoryMethod === 'DIRECT'
        ? 'ใช้กับสินค้าที่รับเข้าและขายออกเป็นจำนวนแน่นอน เช่น ถุงมือรับเข้าเป็นคู่และขายเป็นคู่'
        : 'ใช้กับสินค้าที่แบ่ง Repack แล้วจำนวนชิ้นต่อห่อไม่แน่นอน แพ็กย่อยจะไม่ตัดห่อใหญ่อัตโนมัติ แต่รายการขายทั้งห่อสามารถกำหนดให้ตัดครั้งละ 1 ห่อได้'
    }
  },
  async mounted() {
    const sourceSku = this.isEditing ? this.sku : String(this.$route.query.copyFrom || '')
    if (!sourceSku) return
    try {
      const product = await fetchGoodboochProduct(sourceSku)
      if (!product) { this.error = 'ไม่พบสินค้า SKU นี้'; return }
      if (this.isEditing) {
        this.form = { ...emptyForm(), ...product }
        const [transactions, mappings] = await Promise.all([fetchGoodboochStockTransactions(), fetchGoodboochSalesSkuMappings()])
        this.skuLocked = transactions.some((item) => item.productSku === this.originalSku) || mappings.some((item) => item.productSku === this.originalSku)
      } else {
        this.form = { ...emptyForm(), ...product, sku: '', isActive: true }
        this.copyMessage = `คัดลอกรายละเอียดจาก ${sourceSku} แล้ว กรุณากรอก SKU ใหม่`
      }
    } catch (error) {
      console.error(error)
      this.error = 'ไม่สามารถโหลดข้อมูลสินค้าได้'
    } finally { this.loading = false }
  },
  methods: {
    async save() {
      if (!this.canSave) return
      this.saving = true; this.error = ''
      try {
        if (this.isEditing) {
          if (this.isRenaming) await renameGoodboochProduct(this.originalSku, this.form)
          else await updateGoodboochProduct(this.form)
        } else {
          await createGoodboochProduct(this.form)
        }
        await this.$router.replace({ name: 'goodbooch-product-list' })
      } catch (error) {
        console.error(error)
        this.error = String(error?.message || '').includes('ALREADY_EXISTS') ? 'SKU นี้มีอยู่แล้ว กรุณาใช้ SKU อื่น' : 'ไม่สามารถบันทึกสินค้าได้ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง'
      } finally { this.saving = false }
    }
  }
}
</script>

<style scoped>
.field-label { display: block; margin-bottom: .5rem; font-size: .875rem; font-weight: 500; color: var(--p-surface-600); }
</style>
