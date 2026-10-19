<template>
  <section>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-primary-600">Goodbooch · Transaction Data</p>
        <h2 class="mt-1 text-3xl font-semibold tracking-tight">Stock</h2>
        <p class="mt-2 text-sm text-surface-500">เริ่มต้นจากศูนย์ แล้วบันทึกยอดที่นับได้จริงในหน่วยหลักของ Goodbooch</p>
      </div>
      <Button label="รับสินค้าเข้า" icon="pi pi-plus" :disabled="!startedProducts.length" @click="openReceipt()" />
    </div>

    <Message v-if="error" severity="error" class="mt-5">{{ error }}</Message>
    <Message v-if="successMessage" severity="success" class="mt-5" closable @close="successMessage = ''">{{ successMessage }}</Message>

    <div class="mt-6 grid gap-4 sm:grid-cols-3">
      <div class="summary-card"><span>สินค้าทั้งหมด</span><strong>{{ products.length.toLocaleString('th-TH') }}</strong></div>
      <div class="summary-card"><span>เริ่มนับสต็อกแล้ว</span><strong>{{ startedProducts.length.toLocaleString('th-TH') }}</strong></div>
      <div class="summary-card"><span>รอบันทึกยอดตั้งต้น</span><strong>{{ waitingCount.toLocaleString('th-TH') }}</strong></div>
    </div>

    <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-semibold">ยอดคงเหลือ</h3>
          <p class="mt-1 text-sm text-surface-500">ยอดคงเหลือคำนวณจากประวัติการเคลื่อนไหวทั้งหมด</p>
        </div>
        <IconField class="w-full sm:w-80">
          <InputIcon class="pi pi-search" />
          <InputText v-model="productSearch" class="w-full" placeholder="ค้นหา SKU หรือชื่อสินค้า" />
        </IconField>
      </div>

      <DataTable :value="filteredStockRows" :loading="loading" data-key="sku" striped-rows paginator :rows="25" :rows-per-page-options="[25, 50, 100]" table-style="width: 100%; table-layout: fixed">
        <template #empty>ยังไม่มีสินค้า Goodbooch</template>
        <Column field="sku" header="SKU" sortable style="width: 22%"><template #body="p"><span class="break-words font-medium">{{ p.data.sku }}</span></template></Column>
        <Column field="productName" header="ชื่อสินค้า" sortable style="width: 30%"><template #body="p"><span class="break-words">{{ p.data.productName }}</span></template></Column>
        <Column field="balance" header="คงเหลือ" sortable style="width: 13%"><template #body="p"><span class="text-lg font-semibold" :class="p.data.balance <= p.data.lowStockThreshold && p.data.started ? 'text-red-600' : ''">{{ formatNumber(p.data.balance) }}</span></template></Column>
        <Column field="baseUnit" header="หน่วย" sortable style="width: 10%" />
        <Column field="started" header="ยอดตั้งต้น" sortable style="width: 12%"><template #body="p"><Tag :value="p.data.started ? 'บันทึกแล้ว' : 'ยังไม่เริ่ม'" :severity="p.data.started ? 'success' : 'warn'" /></template></Column>
        <Column header="จัดการ" style="width: 13%">
          <template #body="p">
            <Button v-if="!p.data.started" label="ยอดตั้งต้น" icon="pi pi-clipboard" size="small" @click="openInitialCount(p.data)" />
            <Button v-else label="รับเข้า" icon="pi pi-plus" severity="secondary" outlined size="small" @click="openReceipt(p.data)" />
          </template>
        </Column>
      </DataTable>
    </section>

    <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-semibold">ประวัติการเคลื่อนไหว</h3>
          <p class="mt-1 text-sm text-surface-500">รายการที่บันทึกแล้วจะไม่ถูกแก้ไขหรือเขียนทับ</p>
        </div>
        <IconField class="w-full sm:w-80">
          <InputIcon class="pi pi-search" />
          <InputText v-model="historySearch" class="w-full" placeholder="ค้นหา SKU ชื่อสินค้า หรือหมายเหตุ" />
        </IconField>
      </div>

      <DataTable :value="filteredTransactions" :loading="loading" data-key="id" striped-rows paginator :rows="25" :rows-per-page-options="[25, 50, 100]" sort-field="createdAt" :sort-order="-1">
        <template #empty>ยังไม่มีประวัติการเคลื่อนไหว</template>
        <Column field="transactionDate" header="วันที่" sortable><template #body="p">{{ formatDate(p.data.transactionDate) }}</template></Column>
        <Column field="productSku" header="SKU" sortable><template #body="p"><span class="font-medium">{{ p.data.productSku }}</span></template></Column>
        <Column field="productName" header="ชื่อสินค้า" sortable />
        <Column field="transactionType" header="รายการ" sortable><template #body="p"><Tag :value="transactionLabel(p.data.transactionType)" :severity="p.data.transactionType === 'INITIAL_COUNT' ? 'info' : 'success'" /></template></Column>
        <Column field="quantityChange" header="จำนวน" sortable><template #body="p"><span class="font-semibold text-green-700">+{{ formatNumber(p.data.quantityChange) }}</span></template></Column>
        <Column field="unitText" header="หน่วย" sortable />
        <Column field="noteText" header="หมายเหตุ"><template #body="p">{{ p.data.noteText || '—' }}</template></Column>
      </DataTable>
    </section>

    <Dialog v-model:visible="dialogVisible" modal :closable="!saving" :dismissable-mask="!saving" :header="dialogTitle" class="w-[min(92vw,34rem)]">
      <form class="space-y-5" @submit.prevent="saveTransaction">
        <label class="block">
          <span class="field-label">สินค้า *</span>
          <Select v-model="form.productSku" :options="dialogProducts" option-label="displayName" option-value="sku" filter class="w-full" placeholder="เลือกสินค้า" :disabled="Boolean(selectedProduct) || saving" @change="syncSelectedUnit" />
        </label>

        <div v-if="form.productSku" class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          กรอกจำนวนเป็นหน่วย <strong>{{ form.unitText }}</strong> ของ Goodbooch โดยตรง ระบบจะไม่แปลงหน่วยจาก Ideal Globe
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <label class="block">
            <span class="field-label">วันที่ *</span>
            <DatePicker v-model="form.transactionDate" date-format="dd/mm/yy" show-icon class="w-full" :disabled="saving" />
          </label>
          <label class="block">
            <span class="field-label">จำนวน *</span>
            <InputNumber v-model="form.quantityChange" class="w-full" input-class="w-full" :min="form.transactionType === 'INITIAL_COUNT' ? 0 : 1" :max-fraction-digits="0" show-buttons :suffix="form.unitText ? ` ${form.unitText}` : ''" :disabled="saving" />
          </label>
        </div>

        <label class="block">
          <span class="field-label">หมายเหตุ</span>
          <Textarea v-model="form.noteText" class="w-full" rows="3" maxlength="500" auto-resize :disabled="saving" :placeholder="form.transactionType === 'INITIAL_COUNT' ? 'เช่น ตรวจนับหลังแพ็กสินค้าเสร็จ' : 'เช่น รับจาก Ideal Globe'" />
        </label>

        <Message v-if="dialogError" severity="error">{{ dialogError }}</Message>

        <div class="flex justify-end gap-3 border-t border-surface-200 pt-4">
          <Button type="button" label="ยกเลิก" severity="secondary" outlined :disabled="saving" @click="dialogVisible = false" />
          <Button type="submit" :label="form.transactionType === 'INITIAL_COUNT' ? 'บันทึกยอดตั้งต้น' : 'บันทึกรับเข้า'" icon="pi pi-save" :loading="saving" :disabled="!canSave" />
        </div>
      </form>
    </Dialog>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import { fetchGoodboochProducts } from '../../../services/goodbooch-product-data.js'
import { createGoodboochStockTransaction, fetchGoodboochStockTransactions, GOODBOOCH_STOCK_TRANSACTION_TYPES, goodboochStockTransactionLabel } from '../../../services/goodbooch-stock-data.js'

function today() {
  const value = new Date()
  value.setHours(0, 0, 0, 0)
  return value
}

function toDateInput(value) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default {
  name: 'GoodboochStockView',
  components: { Button, Column, DataTable, DatePicker, Dialog, IconField, InputIcon, InputNumber, InputText, Message, Select, Tag, Textarea },
  data() {
    return {
      products: [], transactions: [], productSearch: '', historySearch: '', loading: true, error: '', successMessage: '',
      dialogVisible: false, saving: false, dialogError: '', selectedProduct: null,
      form: { productSku: '', transactionType: GOODBOOCH_STOCK_TRANSACTION_TYPES.INITIAL_COUNT, transactionDate: today(), quantityChange: null, unitText: '', noteText: '' }
    }
  },
  computed: {
    productMap() { return new Map(this.products.map((product) => [product.sku, product])) },
    initialCountSkus() { return new Set(this.transactions.filter((item) => item.transactionType === GOODBOOCH_STOCK_TRANSACTION_TYPES.INITIAL_COUNT).map((item) => item.productSku)) },
    balances() {
      const values = new Map()
      for (const item of this.transactions) values.set(item.productSku, (values.get(item.productSku) || 0) + Number(item.quantityChange || 0))
      return values
    },
    stockRows() {
      return this.products.map((product) => ({ ...product, balance: this.balances.get(product.sku) || 0, started: this.initialCountSkus.has(product.sku) }))
    },
    startedProducts() { return this.stockRows.filter((product) => product.started && product.isActive) },
    waitingCount() { return this.stockRows.filter((product) => !product.started && product.isActive).length },
    filteredStockRows() {
      const keyword = this.productSearch.trim().toLocaleLowerCase('th-TH')
      if (!keyword) return this.stockRows
      return this.stockRows.filter((product) => [product.sku, product.productName].some((value) => String(value || '').toLocaleLowerCase('th-TH').includes(keyword)))
    },
    transactionsWithProduct() {
      return this.transactions.map((item) => ({ ...item, productName: this.productMap.get(item.productSku)?.productName || 'สินค้าเดิม' }))
    },
    filteredTransactions() {
      const keyword = this.historySearch.trim().toLocaleLowerCase('th-TH')
      if (!keyword) return this.transactionsWithProduct
      return this.transactionsWithProduct.filter((item) => [item.productSku, item.productName, item.noteText].some((value) => String(value || '').toLocaleLowerCase('th-TH').includes(keyword)))
    },
    dialogProducts() {
      const source = this.form.transactionType === GOODBOOCH_STOCK_TRANSACTION_TYPES.INITIAL_COUNT
        ? this.stockRows.filter((product) => !product.started && product.isActive)
        : this.startedProducts
      return source.map((product) => ({ ...product, displayName: `${product.sku} · ${product.productName}` }))
    },
    dialogTitle() { return this.form.transactionType === GOODBOOCH_STOCK_TRANSACTION_TYPES.INITIAL_COUNT ? 'บันทึกยอดตั้งต้นจากการตรวจนับ' : 'รับสินค้าเข้า' },
    canSave() {
      const quantity = Number(this.form.quantityChange)
      const validQuantity = this.form.transactionType === GOODBOOCH_STOCK_TRANSACTION_TYPES.INITIAL_COUNT ? quantity >= 0 : quantity > 0
      return Boolean(this.form.productSku && this.form.transactionDate && this.form.quantityChange !== null && validQuantity && this.form.unitText) && !this.saving
    }
  },
  async mounted() { await this.loadData() },
  methods: {
    transactionLabel: goodboochStockTransactionLabel,
    formatNumber(value) { return Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 }) },
    formatDate(value) {
      if (!value) return '—'
      return new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
    },
    async loadData() {
      this.loading = true; this.error = ''
      try { [this.products, this.transactions] = await Promise.all([fetchGoodboochProducts(), fetchGoodboochStockTransactions()]) }
      catch (error) { console.error(error); this.error = 'ไม่สามารถโหลดข้อมูลสต็อก Goodbooch ได้' }
      finally { this.loading = false }
    },
    resetForm(type, product) {
      this.selectedProduct = product || null
      this.form = { productSku: product?.sku || '', transactionType: type, transactionDate: today(), quantityChange: null, unitText: product?.baseUnit || '', noteText: '' }
      this.dialogError = ''
    },
    openInitialCount(product) { this.resetForm(GOODBOOCH_STOCK_TRANSACTION_TYPES.INITIAL_COUNT, product); this.dialogVisible = true },
    openReceipt(product = null) { this.resetForm(GOODBOOCH_STOCK_TRANSACTION_TYPES.RECEIPT, product); this.dialogVisible = true },
    syncSelectedUnit() { this.form.unitText = this.productMap.get(this.form.productSku)?.baseUnit || '' },
    async saveTransaction() {
      if (!this.canSave) return
      if (this.form.transactionType === GOODBOOCH_STOCK_TRANSACTION_TYPES.INITIAL_COUNT && this.initialCountSkus.has(this.form.productSku)) {
        this.dialogError = 'สินค้านี้มียอดตั้งต้นแล้ว ไม่สามารถบันทึกซ้ำได้'
        return
      }
      this.saving = true; this.dialogError = ''
      try {
        await createGoodboochStockTransaction({ ...this.form, transactionDate: toDateInput(this.form.transactionDate) })
        const label = this.transactionLabel(this.form.transactionType)
        const sku = this.form.productSku
        this.dialogVisible = false
        this.successMessage = `${label}ของ ${sku} เรียบร้อยแล้ว`
        await this.loadData()
      } catch (error) {
        console.error(error)
        this.dialogError = 'ไม่สามารถบันทึกรายการสต็อกได้ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง'
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
