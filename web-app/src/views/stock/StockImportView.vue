<template>
  <section>
    <ConfirmDialog />
    <Message severity="warn">ไฟล์ต้องเป็น Stock Snapshot ครบทั้งช่วงคลัง รายการที่หายไปจากไฟล์ใหม่ของวันและช่วงคลังเดียวกันจะถูกปิดใช้งาน</Message>
    <section class="mt-6 max-w-5xl rounded-xl border border-surface-200 bg-white p-8">
      <div class="rounded-xl border-2 border-dashed border-surface-300 bg-surface-50 p-10 text-center">
        <i class="pi pi-file-arrow-up text-4xl text-primary-500" />
        <h3 class="mt-4 text-lg font-semibold">เลือกไฟล์ CSV Stock จาก Express</h3>
        <p class="mt-2 text-sm text-surface-500">รองรับรายงานสินค้าคงเหลือ Windows-874 ขนาดไม่เกิน 2 MB</p>
        <FileUpload mode="basic" accept=".csv,text/csv" choose-label="เลือกไฟล์ CSV" custom-upload class="mt-6" :disabled="busy" @select="selectFile" />
      </div>
      <div v-if="file" class="mt-6 flex items-center justify-between rounded-lg border border-surface-200 p-4">
        <span>{{ file.name }} · {{ (file.size / 1024).toFixed(1) }} KB</span>
        <Button label="ตรวจสอบไฟล์" icon="pi pi-search" :loading="loading" :disabled="busy" @click="previewFile" />
      </div>
      <Message v-if="error" severity="error" class="mt-4">{{ error }}</Message>
    </section>

    <section v-if="preview" class="mt-6 max-w-[90rem] space-y-6">
      <Message :severity="preview.isValid ? 'success' : 'error'">
        {{ preview.isValid ? `ไฟล์ผ่านการตรวจสอบ · Snapshot ${date(preview.snapshotDate)} · คลัง ${preview.warehouseFrom} ถึง ${preview.warehouseTo}` : 'พบข้อผิดพลาด กรุณาตรวจสอบไฟล์และ Product Master Data' }}
      </Message>
      <Message v-if="preview.summary.lotMismatchCount" severity="warn">Express แจ้งเตือน {{ preview.summary.lotMismatchCount }} สินค้าว่ายอดรวม Lot ไม่เท่ากับยอดคงเหลือ ระบบจะยึดจำนวนคงเหลือระดับสินค้าเป็นหลัก</Message>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div v-for="card in cards" :key="card.label" class="rounded-xl border border-surface-200 bg-white p-4">
          <p class="text-xs text-surface-500">{{ card.label }}</p><p class="mt-1 text-2xl font-semibold">{{ card.value }}</p>
        </div>
      </div>
      <div v-if="preview.errors.length" class="rounded-xl border border-red-200 bg-white p-5 text-red-700">
        <p v-for="(item, index) in preview.errors" :key="index">บรรทัด {{ item.rowNumber || '-' }}: {{ item.message }}</p>
      </div>
      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <DataTable :value="preview.rows" paginator :rows="25" :rows-per-page-options="[25, 50, 100]" striped-rows>
          <Column field="productCode" header="รหัสสินค้า" style="width: 16rem" />
          <Column field="productName" header="ชื่อสินค้า" />
          <Column field="quantity" header="คงเหลือ"><template #body="p">{{ quantity(p.data.quantity) }}</template></Column>
          <Column field="sourceUnitText" header="หน่วย" />
          <Column field="unitCost" header="ต้นทุน/หน่วย"><template #body="p">{{ nullableMoney(p.data.unitCost) }}</template></Column>
          <Column field="inventoryValue" header="มูลค่า"><template #body="p">{{ money(p.data.inventoryValue) }}</template></Column>
          <Column field="lotCount" header="Lot" />
          <Column header="ผล"><template #body="p"><Tag :value="label(p.data.changeType)" :severity="severity(p.data.changeType)" /></template></Column>
        </DataTable>
      </div>
      <div v-if="preview.isValid && !result" class="flex justify-end rounded-xl border border-surface-200 bg-white p-5">
        <Button label="ยืนยัน Import Stock" icon="pi pi-check" :loading="importing" :disabled="busy" @click="confirmDialog" />
      </div>
      <Message v-if="result" severity="success">{{ result.alreadyImported ? 'ไฟล์นี้เคย Import แล้ว' : 'Import Stock สำเร็จ' }} {{ result.summary.totalRows }} สินค้า</Message>
    </section>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Column from 'primevue/column'
import ConfirmDialog from 'primevue/confirmdialog'
import DataTable from 'primevue/datatable'
import FileUpload from 'primevue/fileupload'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { confirmStockFile, previewStockFile } from '../../services/stock-data.js'

export default {
  name: 'StockImportView',
  components: { Button, Column, ConfirmDialog, DataTable, FileUpload, Message, Tag },
  emits: ['imported'],
  data() { return { file: null, preview: null, result: null, loading: false, importing: false, error: '' } },
  computed: {
    busy() { return this.loading || this.importing },
    cards() {
      const summary = this.preview?.summary
      if (!summary) return []
      return [
        { label: 'สินค้า', value: summary.totalRows.toLocaleString('th-TH') },
        { label: 'รายการ Lot', value: summary.lotRows.toLocaleString('th-TH') },
        { label: 'คงเหลือติดลบ', value: summary.negativeCount.toLocaleString('th-TH') },
        { label: 'Lot ไม่ตรง', value: summary.lotMismatchCount.toLocaleString('th-TH') },
        { label: 'สร้างใหม่', value: summary.createCount.toLocaleString('th-TH') },
        { label: 'อัปเดต', value: summary.updateCount.toLocaleString('th-TH') },
        { label: 'ไม่เปลี่ยน', value: summary.unchangedCount.toLocaleString('th-TH') },
        { label: 'จะปิด', value: summary.deactivateCount.toLocaleString('th-TH') },
        { label: 'มูลค่ารวม', value: this.money(summary.totalInventoryValue) },
        { label: 'ข้อผิดพลาด', value: summary.errorCount.toLocaleString('th-TH') }
      ]
    }
  },
  methods: {
    selectFile(event) { this.file = event.files[0] || null; this.preview = null; this.result = null; this.error = '' },
    async previewFile() {
      if (!this.file || this.busy) return
      this.loading = true; this.error = ''
      try { this.preview = await previewStockFile(this.file) } catch (error) { console.error(error); this.error = error.message || 'ไม่สามารถตรวจสอบไฟล์ Stock ได้' } finally { this.loading = false }
    },
    confirmDialog() {
      this.$confirm.require({
        header: 'ยืนยัน Import Stock', message: `ระบบจะบันทึก Snapshot ${this.preview.summary.totalRows} สินค้า และ ${this.preview.summary.lotRows} รายการ Lot ต้องการดำเนินการต่อหรือไม่`,
        rejectLabel: 'ยกเลิก', acceptLabel: 'ยืนยัน Import', accept: () => { this.$confirm.close(); void this.importFile() }
      })
    },
    async importFile() {
      if (this.busy) return
      this.importing = true; this.error = ''
      try { this.result = await confirmStockFile(this.file, this.preview.previewId); this.$emit('imported', this.result) } catch (error) { console.error(error); this.error = error.message || 'ไม่สามารถ Import Stock ได้' } finally { this.importing = false }
    },
    date(value) { return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) },
    money(value) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0) },
    nullableMoney(value) { return value == null ? '—' : this.money(value) },
    quantity(value) { return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 }).format(value || 0) },
    label(value) { return { create: 'สร้างใหม่', update: 'อัปเดต', unchanged: 'ไม่เปลี่ยน' }[value] || value },
    severity(value) { return { create: 'success', update: 'warn', unchanged: 'secondary' }[value] || 'secondary' }
  }
}
</script>

<style scoped></style>
