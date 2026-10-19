<template>
  <section>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-primary-600">Goodbooch · Settings</p>
        <h2 class="mt-1 text-3xl font-semibold tracking-tight">Shopee SKU Mapping</h2>
        <p class="mt-2 text-sm text-surface-500">เชื่อม Seller SKU ของแต่ละร้านกับ Stock SKU ของ Goodbooch และกำหนดผลต่อสต็อก</p>
      </div>
      <Button label="เพิ่ม Shopee SKU" icon="pi pi-plus" @click="openCreate" />
    </div>

    <Message v-if="error" severity="error" class="mt-5">{{ error }}</Message>
    <Message v-if="successMessage" severity="success" class="mt-5" closable @close="successMessage = ''">{{ successMessage }}</Message>

    <div class="mt-6 grid gap-4 sm:grid-cols-3">
      <div class="summary-card"><span>Mapping ทั้งหมด</span><strong>{{ mappings.length.toLocaleString('th-TH') }}</strong></div>
      <div class="summary-card"><span>ตัดสต็อกอัตโนมัติ</span><strong>{{ exactCount.toLocaleString('th-TH') }}</strong></div>
      <div class="summary-card"><span>Repack ไม่ตัดอัตโนมัติ</span><strong>{{ noDeductionCount.toLocaleString('th-TH') }}</strong></div>
    </div>

    <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div class="flex flex-wrap items-end gap-3">
          <label class="block">
            <span class="field-label">ร้าน</span>
            <Select v-model="shopFilter" :options="shopFilterOptions" option-label="label" option-value="value" class="w-44" />
          </label>
          <IconField class="w-full sm:w-80">
            <InputIcon class="pi pi-search" />
            <InputText v-model="searchText" class="w-full" placeholder="ค้นหา Shopee SKU หรือสินค้า" />
          </IconField>
        </div>
      </div>

      <DataTable :value="filteredMappings" :loading="loading" data-key="id" striped-rows paginator :rows="25" :rows-per-page-options="[25, 50, 100]" table-style="min-width: 70rem">
        <template #empty>ยังไม่มี Shopee SKU Mapping</template>
        <Column field="shopCode" header="ร้าน" sortable style="width: 10%"><template #body="p"><Tag :value="shopLabel(p.data.shopCode)" :severity="p.data.shopCode === 'GOODBOOCH' ? 'success' : 'info'" /></template></Column>
        <Column field="shopeeSku" header="Shopee SKU" sortable style="width: 18%"><template #body="p"><span class="font-medium">{{ p.data.shopeeSku }}</span></template></Column>
        <Column field="listingName" header="สินค้า / ตัวเลือก" sortable style="width: 20%"><template #body="p"><span>{{ p.data.listingName || '—' }}</span><small v-if="p.data.variantName" class="mt-1 block text-surface-500">{{ p.data.variantName }}</small></template></Column>
        <Column field="productSku" header="Stock SKU" sortable style="width: 19%"><template #body="p"><span class="font-medium">{{ p.data.productSku }}</span><small class="mt-1 block text-surface-500">{{ productName(p.data.productSku) }}</small></template></Column>
        <Column field="stockEffect" header="ผลต่อสต็อก" sortable style="width: 19%"><template #body="p"><Tag :value="effectSummary(p.data)" :severity="p.data.stockEffect === 'DEDUCT_EXACT' ? 'success' : 'warn'" /></template></Column>
        <Column field="isActive" header="สถานะ" sortable style="width: 8%"><template #body="p"><Tag :value="p.data.isActive ? 'ใช้งาน' : 'ปิด'" :severity="p.data.isActive ? 'success' : 'secondary'" /></template></Column>
        <Column header="" style="width: 6%"><template #body="p"><Button icon="pi pi-pencil" text rounded aria-label="แก้ไข Mapping" title="แก้ไข Mapping" @click="openEdit(p.data)" /></template></Column>
      </DataTable>
    </section>

    <Dialog v-model:visible="dialogVisible" modal :closable="!saving" :dismissable-mask="!saving" :header="form.id ? 'แก้ไข Shopee SKU Mapping' : 'เพิ่ม Shopee SKU Mapping'" class="w-[min(94vw,42rem)]">
      <form class="space-y-5" @submit.prevent="saveMapping">
        <div class="grid gap-5 sm:grid-cols-2">
          <label class="block">
            <span class="field-label">ร้าน *</span>
            <Select v-model="form.shopCode" :options="shops" option-label="label" option-value="value" class="w-full" :disabled="saving" />
          </label>
          <label class="block">
            <span class="field-label">Shopee Seller SKU *</span>
            <InputText v-model="form.shopeeSku" class="w-full" maxlength="150" autocomplete="off" :disabled="saving" />
          </label>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <label class="block">
            <span class="field-label">ชื่อสินค้าบน Shopee</span>
            <InputText v-model="form.listingName" class="w-full" maxlength="250" autocomplete="off" :disabled="saving" />
          </label>
          <label class="block">
            <span class="field-label">ชื่อตัวเลือก</span>
            <InputText v-model="form.variantName" class="w-full" maxlength="150" placeholder="เช่น S · 20 ชิ้น" autocomplete="off" :disabled="saving" />
          </label>
        </div>

        <label class="block">
          <span class="field-label">Stock SKU ของ Goodbooch *</span>
          <Select v-model="form.productSku" :options="productOptions" option-label="displayName" option-value="sku" filter class="w-full" placeholder="เลือกสินค้าใน Product Master" :disabled="saving" />
        </label>

        <label class="block">
          <span class="field-label">วิธีตัดสต็อก *</span>
          <Select v-model="form.stockEffect" :options="stockEffects" option-label="label" option-value="value" class="w-full" :disabled="saving" />
        </label>

        <label v-if="form.stockEffect === 'DEDUCT_EXACT'" class="block">
          <span class="field-label">จำนวนที่ตัดต่อการขาย 1 รายการ *</span>
          <InputNumber v-model="form.quantityPerOrder" class="w-full" input-class="w-full" :min="1" :max-fraction-digits="0" show-buttons :disabled="saving" />
          <small class="mt-1.5 block text-surface-500">เช่น ขายเดี่ยวตัด 1 หน่วย หรือขายยกลังตัด 20 หน่วยจาก Stock SKU</small>
        </label>

        <div v-else class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          รายการขายนี้จะเก็บในรายงาน แต่ไม่ตัดสต็อกหลักอัตโนมัติ เหมาะกับแพ็กย่อยที่ Repack จากห่อหรือกล่องใหญ่
        </div>

        <label v-if="form.id" class="flex items-center gap-3 rounded-lg border border-surface-200 p-4">
          <Checkbox v-model="form.isActive" binary input-id="mapping-active" :disabled="saving" />
          <span><span class="block font-medium">เปิดใช้งาน Mapping</span><small class="text-surface-500">ปิดเมื่อเลิกใช้ SKU นี้บน Shopee โดยยังเก็บประวัติเดิมไว้</small></span>
        </label>

        <Message v-if="dialogError" severity="error">{{ dialogError }}</Message>

        <div class="flex justify-end gap-3 border-t border-surface-200 pt-4">
          <Button type="button" label="ยกเลิก" severity="secondary" outlined :disabled="saving" @click="dialogVisible = false" />
          <Button type="submit" label="บันทึก Mapping" icon="pi pi-save" :loading="saving" :disabled="!canSave" />
        </div>
      </form>
    </Dialog>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { fetchGoodboochProducts } from '../../../services/goodbooch-product-data.js'
import { createGoodboochSalesSkuMapping, fetchGoodboochSalesSkuMappings, GOODBOOCH_SHOPS, GOODBOOCH_STOCK_EFFECTS, goodboochShopLabel, updateGoodboochSalesSkuMapping } from '../../../services/goodbooch-sales-sku-mapping-data.js'

function emptyForm() {
  return { id: '', shopCode: 'GOODBOOCH', shopeeSku: '', listingName: '', variantName: '', productSku: '', stockEffect: 'DEDUCT_EXACT', quantityPerOrder: 1, isActive: true }
}

export default {
  name: 'GoodboochSalesSkuMappingView',
  components: { Button, Checkbox, Column, DataTable, Dialog, IconField, InputIcon, InputNumber, InputText, Message, Select, Tag },
  data() {
    return {
      products: [], mappings: [], shops: GOODBOOCH_SHOPS, stockEffects: GOODBOOCH_STOCK_EFFECTS,
      shopFilter: 'ALL', searchText: '', loading: true, error: '', successMessage: '',
      dialogVisible: false, saving: false, dialogError: '', form: emptyForm()
    }
  },
  computed: {
    shopFilterOptions() { return [{ value: 'ALL', label: 'ทุกร้าน' }, ...this.shops] },
    productMap() { return new Map(this.products.map((product) => [product.sku, product])) },
    productOptions() { return this.products.filter((product) => product.isActive).map((product) => ({ ...product, displayName: `${product.sku} · ${product.productName}` })) },
    exactCount() { return this.mappings.filter((item) => item.stockEffect === 'DEDUCT_EXACT' && item.isActive).length },
    noDeductionCount() { return this.mappings.filter((item) => item.stockEffect === 'NO_AUTO_DEDUCTION' && item.isActive).length },
    filteredMappings() {
      const keyword = this.searchText.trim().toLocaleLowerCase('th-TH')
      return this.mappings.filter((item) => {
        if (this.shopFilter !== 'ALL' && item.shopCode !== this.shopFilter) return false
        if (!keyword) return true
        return [item.shopeeSku, item.listingName, item.variantName, item.productSku, this.productName(item.productSku)]
          .some((value) => String(value || '').toLocaleLowerCase('th-TH').includes(keyword))
      })
    },
    duplicateMapping() {
      const target = this.form.shopeeSku.trim().toLocaleLowerCase('en-US')
      return this.mappings.find((item) => item.id !== this.form.id && item.shopCode === this.form.shopCode && item.shopeeSku.trim().toLocaleLowerCase('en-US') === target)
    },
    canSave() {
      const exactQuantityValid = this.form.stockEffect !== 'DEDUCT_EXACT' || Number(this.form.quantityPerOrder) > 0
      return Boolean(this.form.shopCode && this.form.shopeeSku.trim() && this.form.productSku && this.form.stockEffect && exactQuantityValid) && !this.saving
    }
  },
  async mounted() { await this.loadData() },
  methods: {
    shopLabel: goodboochShopLabel,
    productName(sku) { return this.productMap.get(sku)?.productName || 'ไม่พบใน Product Master' },
    effectSummary(mapping) { return mapping.stockEffect === 'DEDUCT_EXACT' ? `ตัด ${Number(mapping.quantityPerOrder).toLocaleString('th-TH')} ${this.productMap.get(mapping.productSku)?.baseUnit || 'หน่วย'}` : 'ไม่ตัดอัตโนมัติ' },
    async loadData() {
      this.loading = true; this.error = ''
      try { [this.products, this.mappings] = await Promise.all([fetchGoodboochProducts(), fetchGoodboochSalesSkuMappings()]) }
      catch (error) { console.error(error); this.error = 'ไม่สามารถโหลด Shopee SKU Mapping ได้' }
      finally { this.loading = false }
    },
    openCreate() { this.form = emptyForm(); this.dialogError = ''; this.dialogVisible = true },
    openEdit(mapping) { this.form = { ...emptyForm(), ...mapping }; this.dialogError = ''; this.dialogVisible = true },
    async saveMapping() {
      if (!this.canSave) return
      if (this.duplicateMapping) {
        this.dialogError = `Shopee SKU นี้มี Mapping ในร้าน ${this.shopLabel(this.form.shopCode)} แล้ว`
        return
      }
      this.saving = true; this.dialogError = ''
      try {
        if (this.form.id) await updateGoodboochSalesSkuMapping(this.form)
        else await createGoodboochSalesSkuMapping(this.form)
        this.dialogVisible = false
        this.successMessage = `บันทึก Mapping ${this.form.shopeeSku.trim()} เรียบร้อยแล้ว`
        await this.loadData()
      } catch (error) {
        console.error(error)
        this.dialogError = 'ไม่สามารถบันทึก Mapping ได้ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง'
      } finally { this.saving = false }
    }
  }
}
</script>

<style scoped>
.summary-card { display: flex; min-height: 104px; flex-direction: column; justify-content: space-between; border: 1px solid var(--p-surface-200); border-radius: .75rem; background: white; padding: 1.1rem; box-shadow: 0 1px 2px rgb(0 0 0 / .04); }
.summary-card span { font-size: .875rem; color: var(--p-surface-500); }
.summary-card strong { font-size: 1.75rem; font-weight: 600; }
.field-label { display: block; margin-bottom: .5rem; font-size: .875rem; font-weight: 500; color: var(--p-surface-600); }
</style>
