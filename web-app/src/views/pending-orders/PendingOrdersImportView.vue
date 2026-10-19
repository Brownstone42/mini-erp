<template>
  <section>
    <ConfirmDialog />
    <Message severity="info">ระบบจะเก็บไฟล์เป็น Snapshot แยกชุด ไม่ลบข้อมูลจากรอบก่อน และยังไม่หักยอดค้างส่งจาก Stock</Message>
    <section class="mt-6 max-w-5xl rounded-xl border border-surface-200 bg-white p-8">
      <div class="rounded-xl border-2 border-dashed border-surface-300 bg-surface-50 p-10 text-center">
        <i class="pi pi-file-arrow-up text-4xl text-primary-500" />
        <h3 class="mt-4 text-lg font-semibold">เลือกไฟล์ CSV สินค้าค้างส่งจาก Express</h3>
        <p class="mt-2 text-sm text-surface-500">รายงานสินค้าค้างส่งแยกตามสินค้า · Windows-874 · ไม่เกิน 2 MB</p>
        <FileUpload mode="basic" accept=".csv,text/csv" choose-label="เลือกไฟล์ CSV" custom-upload class="mt-6" :disabled="busy" @select="selectFile" />
      </div>
      <div v-if="file" class="mt-6 flex items-center justify-between rounded-lg border border-surface-200 p-4">
        <span>{{ file.name }} · {{ (file.size / 1024).toFixed(1) }} KB</span>
        <Button label="ตรวจสอบไฟล์" icon="pi pi-search" :loading="loading" :disabled="busy" @click="previewFile" />
      </div>
      <Message v-if="error" severity="error" class="mt-4">{{ error }}</Message>
    </section>

    <section v-if="preview" class="mt-6 space-y-5">
      <Message :severity="preview.isValid ? 'success' : 'error'">
        {{ preview.isValid ? 'ไฟล์ผ่านการตรวจสอบ' : 'พบข้อผิดพลาด กรุณาตรวจสอบไฟล์' }}
        · พิมพ์รายงาน {{ date(preview.reportDate) }} · ส่งของวันที่ {{ date(preview.periodStart) }} ถึง {{ date(preview.periodEnd) }}
      </Message>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="card in cards" :key="card.label" class="rounded-xl border border-surface-200 bg-white p-4">
          <p class="text-xs text-surface-500">{{ card.label }}</p><p class="mt-1 text-2xl font-semibold">{{ card.value }}</p>
        </div>
      </div>
      <p class="text-sm text-surface-500">คลัง {{ preview.warehouseFrom || '—' }} ถึง {{ preview.warehouseTo || '—' }} · ลูกค้า {{ preview.customerFrom || 'ต้นช่วง' }} ถึง {{ preview.customerTo || 'ปลายช่วง' }}</p>
      <Message v-if="preview.alreadyImported" severity="info">ไฟล์นี้เคย Import แล้ว จะไม่บันทึกซ้ำ</Message>
      <div v-if="preview.warnings.length" class="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p class="font-semibold">ข้อควรตรวจสอบ</p>
        <p v-for="(item, index) in preview.warnings" :key="index" class="mt-2">{{ item.productCode ? `${item.productCode} · ` : '' }}{{ item.message }}</p>
      </div>
      <div v-if="preview.errors.length" class="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">
        <p v-for="(item, index) in preview.errors" :key="index">บรรทัด {{ item.rowNumber || '-' }}: {{ item.message }}</p>
      </div>
      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <DataTable :value="preview.rows" paginator :rows="25" :rows-per-page-options="[25, 50, 100]" striped-rows>
          <Column field="productCode" header="รหัสสินค้า" />
          <Column field="productName" header="ชื่อสินค้า" />
          <Column field="customerName" header="ลูกค้า" />
          <Column field="documentNumber" header="ใบสั่งขาย" />
          <Column field="deliveryDate" header="กำหนดส่ง"><template #body="p">{{ date(p.data.deliveryDate) }}</template></Column>
          <Column field="pendingQuantity" header="ค้างส่ง"><template #body="p">{{ quantity(p.data.pendingQuantity) }}</template></Column>
          <Column field="sourceUnitText" header="หน่วย" />
        </DataTable>
      </div>
      <div v-if="preview.isValid && !preview.alreadyImported && !result" class="flex justify-end rounded-xl border border-surface-200 bg-white p-5">
        <Button label="ยืนยัน Import Pending Orders" icon="pi pi-check" :loading="importing" :disabled="busy" @click="confirmDialog" />
      </div>
      <Message v-if="result" severity="success">{{ result.alreadyImported ? 'ไฟล์นี้เคย Import แล้ว' : 'Import สำเร็จ' }} {{ result.summary.totalRows }} รายการ</Message>
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
import { confirmPendingOrdersFile, previewPendingOrdersFile } from '../../services/pending-orders-data.js'

export default {
  name: 'PendingOrdersImportView',
  components: { Button, Column, ConfirmDialog, DataTable, FileUpload, Message },
  emits: ['imported'],
  data() { return { file: null, preview: null, result: null, loading: false, importing: false, error: '' } },
  computed: {
    busy() { return this.loading || this.importing },
    cards() {
      const summary = this.preview?.summary
      if (!summary) return []
      return [
        { label: 'รายการค้างส่ง', value: summary.totalRows.toLocaleString('th-TH') },
        { label: 'สินค้า', value: summary.productCount.toLocaleString('th-TH') },
        { label: 'หน่วยต่างจากยอดในมือ', value: summary.unitMismatchCount.toLocaleString('th-TH') },
        { label: 'ไม่พบรหัสใน Product Master', value: summary.unmatchedProductCount.toLocaleString('th-TH') },
        { label: 'ข้อผิดพลาด', value: summary.errorCount.toLocaleString('th-TH') }
      ]
    }
  },
  methods: {
    selectFile(event) { this.file = event.files[0] || null; this.preview = null; this.result = null; this.error = '' },
    async previewFile() {
      if (!this.file || this.busy) return
      this.loading = true; this.error = ''
      try { this.preview = await previewPendingOrdersFile(this.file) } catch (error) { console.error(error); this.error = error.message || 'ไม่สามารถตรวจสอบไฟล์ได้' } finally { this.loading = false }
    },
    confirmDialog() {
      this.$confirm.require({
        header: 'ยืนยัน Import Pending Orders',
        message: `บันทึก ${this.preview.summary.totalRows} รายการเป็น Snapshot ใหม่ โดยไม่ลบ Snapshot เดิม ต้องการดำเนินการต่อหรือไม่`,
        rejectLabel: 'ยกเลิก', acceptLabel: 'ยืนยัน Import',
        accept: () => { this.$confirm.close(); void this.importFile() }
      })
    },
    async importFile() {
      if (this.busy || !this.preview?.isValid || this.preview.alreadyImported) return
      this.importing = true; this.error = ''
      try { this.result = await confirmPendingOrdersFile(this.file, this.preview.previewId); this.$emit('imported', this.result) } catch (error) { console.error(error); this.error = error.message || 'ไม่สามารถ Import ได้' } finally { this.importing = false }
    },
    date(value) { return value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : '—' },
    quantity(value) { return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 }).format(value || 0) }
  }
}
</script>

<style scoped></style>
