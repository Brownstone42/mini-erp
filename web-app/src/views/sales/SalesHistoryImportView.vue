<template>
  <section>
    <ConfirmDialog />
    <Dialog v-model:visible="documentDialogVisible" modal :header="`เอกสาร ${selectedDocumentNumber}`" class="w-full max-w-6xl">
      <DataTable :value="selectedDocumentRows" striped-rows>
        <Column field="productCode" header="รหัสสินค้า" style="width: 15rem" />
        <Column field="productName" header="ชื่อสินค้า" />
        <Column header="ประเภท" style="width: 7rem">
          <template #body="slotProps"><Tag :value="slotProps.data.isReturn ? 'คืน' : 'ขาย'" :severity="slotProps.data.isReturn ? 'danger' : 'success'" /></template>
        </Column>
        <Column field="sourceQuantity" header="จำนวน" style="width: 7rem" />
        <Column field="sourceUnitText" header="หน่วย" style="width: 6rem" />
        <Column header="ยอดสุทธิ" style="width: 10rem"><template #body="slotProps">{{ formatMoney(slotProps.data.signedNetAmount) }}</template></Column>
      </DataTable>
    </Dialog>

    <div v-if="!embedded">
      <p class="text-sm font-medium text-primary-600">Sales · Sales History</p>
      <h2 class="mt-1 text-3xl font-semibold tracking-tight">Import from Express</h2>
      <p class="mt-2 text-sm text-surface-500">หนึ่งแถวต่อหนึ่งรายการสินค้า และกดเลขที่เอกสารเพื่อดูรายการทั้งใบ</p>
    </div>

    <Message severity="warn" class="mt-6 max-w-5xl">
      ไฟล์ต้องมีประวัติการขายครบทั้งหมดภายในช่วงวันที่ในหัวรายงาน รายการที่หายไปจากไฟล์รอบใหม่ในช่วงเดียวกันจะถูกปิดใช้งานเมื่อยืนยัน Import
    </Message>

    <section class="mt-6 max-w-5xl rounded-xl border border-surface-200 bg-white p-8 shadow-sm">
      <div class="rounded-xl border-2 border-dashed border-surface-300 bg-surface-50 p-10 text-center">
        <i class="pi pi-file-arrow-up text-4xl text-primary-500" />
        <h3 class="mt-4 text-lg font-semibold">เลือกไฟล์ CSV Sales History จาก Express</h3>
        <p class="mt-2 text-sm text-surface-500">รองรับรายงานประวัติการขายแยกตามสินค้า แบบ Windows-874 ขนาดไม่เกิน 2 MB</p>
        <FileUpload
          mode="basic" name="salesHistoryFile" accept=".csv,text/csv" choose-label="เลือกไฟล์ CSV"
          choose-icon="pi pi-folder-open" custom-upload class="mt-6" :disabled="isLoading" @select="selectFile"
        />
      </div>
      <div v-if="selectedFile" class="mt-6 flex items-center justify-between rounded-lg border border-surface-200 p-4">
        <div class="flex items-center gap-3">
          <i class="pi pi-file text-xl text-primary-500" />
          <div><p class="text-sm font-medium">{{ selectedFile.name }}</p><p class="text-xs text-surface-500">{{ formatFileSize(selectedFile.size) }}</p></div>
        </div>
        <Button label="ตรวจสอบไฟล์" icon="pi pi-search" :loading="isLoading" @click="previewFile" />
      </div>
      <Message v-if="requestError" severity="error" class="mt-4">{{ requestError }}</Message>
    </section>

    <section v-if="preview" class="mt-6 max-w-[90rem] space-y-6">
      <Message :severity="preview.isValid ? 'success' : 'error'">
        {{ preview.isValid ? `ไฟล์ผ่านการตรวจสอบ ช่วง ${formatDate(preview.periodStart)} ถึง ${formatDate(preview.periodEnd)} — ข้อมูลยังไม่ได้ถูกบันทึก` : 'พบข้อผิดพลาด จึงยังไม่สามารถนำเข้าข้อมูลได้' }}
      </Message>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <div v-for="item in summaryCards" :key="item.label" class="rounded-xl border border-surface-200 bg-white p-4">
          <p class="text-xs text-surface-500">{{ item.label }}</p><p class="mt-1 text-2xl font-semibold">{{ item.value }}</p>
        </div>
      </div>
      <div v-if="preview.errors.length" class="rounded-xl border border-red-200 bg-white p-5">
        <h3 class="font-semibold text-red-700">รายการที่ต้องแก้ไขก่อน Import</h3>
        <ul class="mt-3 space-y-2 text-sm"><li v-for="(error, index) in preview.errors" :key="index">บรรทัด {{ error.rowNumber || '-' }}: {{ error.message }}</li></ul>
      </div>
      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <h3 class="font-semibold">ตัวอย่างมุมมอง Sales History</h3>
        <p class="mt-1 text-sm text-surface-500">กดเลขที่เอกสารเพื่อดูทุกรายการในเอกสารเดียวกัน</p>
        <DataTable :value="preview.rows" paginator :rows="25" :rows-per-page-options="[25, 50, 100]" class="mt-4" striped-rows>
          <Column field="transactionDate" header="วันที่" sortable style="width: 8rem"><template #body="slotProps">{{ formatDate(slotProps.data.transactionDate) }}</template></Column>
          <Column header="เอกสาร" style="width: 10rem"><template #body="slotProps"><Button :label="slotProps.data.documentNumber" link class="p-0" @click="openDocument(slotProps.data.documentNumber)" /></template></Column>
          <Column field="productCode" header="รหัสสินค้า" style="width: 15rem" />
          <Column field="productName" header="ชื่อสินค้า" />
          <Column field="customerCode" header="ลูกค้า" style="width: 9rem" />
          <Column header="ขาย/คืน" style="width: 7rem"><template #body="slotProps"><Tag :value="slotProps.data.isReturn ? 'คืน' : 'ขาย'" :severity="slotProps.data.isReturn ? 'danger' : 'success'" /></template></Column>
          <Column field="sourceQuantity" header="จำนวน" style="width: 7rem" />
          <Column field="sourceUnitText" header="หน่วย" style="width: 6rem" />
          <Column header="ยอดสุทธิ" style="width: 10rem"><template #body="slotProps">{{ formatMoney(slotProps.data.signedNetAmount) }}</template></Column>
          <Column header="ผลที่จะเกิดขึ้น" style="width: 11rem"><template #body="slotProps"><Tag :value="changeLabel(slotProps.data.changeType)" :severity="changeSeverity(slotProps.data.changeType)" /></template></Column>
        </DataTable>
      </div>
      <Message severity="info">ขั้นนี้เป็น Preview และต้นแบบหน้ารายการเท่านั้น ยังไม่มีการบันทึก Sales History</Message>
      <div v-if="preview.isValid && !importResult" class="flex justify-end rounded-xl border border-surface-200 bg-white p-5">
        <Button label="ยืนยัน Import Sales History" icon="pi pi-check" :loading="isImporting" :disabled="isImporting" @click="requestImportConfirmation" />
      </div>
      <Message v-if="importResult" severity="success">
        {{ importResult.alreadyImported ? 'ไฟล์นี้เคย Import สำเร็จแล้ว' : 'Import Sales History สำเร็จ' }}
        {{ importResult.summary.totalRows }} รายการ เมื่อ {{ formatDateTime(importResult.importedAt) }}
      </Message>
    </section>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Column from 'primevue/column'
import ConfirmDialog from 'primevue/confirmdialog'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import FileUpload from 'primevue/fileupload'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { confirmSalesHistoryFile, previewSalesHistoryFile } from '../../services/sales-history-import.js'

export default {
  name: 'SalesHistoryImportView', components: { Button, Column, ConfirmDialog, DataTable, Dialog, FileUpload, Message, Tag },
  props: { embedded: { type: Boolean, default: false } },
  emits: ['imported'],
  data() { return { selectedFile: null, preview: null, importResult: null, isLoading: false, isImporting: false, requestError: '', documentDialogVisible: false, selectedDocumentNumber: '' } },
  computed: {
    summaryCards() {
      const s = this.preview?.summary
      if (!s) return []
      return [
        { label: 'รายการทั้งหมด', value: s.totalRows }, { label: 'รายการคืน', value: s.returnCount },
        { label: 'สร้างใหม่', value: s.createCount }, { label: 'อัปเดต', value: s.updateCount },
        { label: 'ไม่เปลี่ยนแปลง', value: s.unchangedCount }, { label: 'จะปิดใช้งาน', value: s.deactivateCount },
        { label: 'ข้อผิดพลาด', value: s.errorCount }
      ]
    },
    selectedDocumentRows() { return this.preview?.rows.filter((row) => row.documentNumber === this.selectedDocumentNumber) || [] }
  },
  methods: {
    selectFile(event) { this.selectedFile = event.files[0] || null; this.preview = null; this.importResult = null; this.requestError = '' },
    async previewFile() {
      if (!this.selectedFile || this.isLoading) return
      this.isLoading = true; this.preview = null; this.requestError = ''
      try { this.preview = await previewSalesHistoryFile(this.selectedFile) } catch (error) {
        console.error('Unable to preview Sales History', error); this.requestError = error.message || 'ไม่สามารถตรวจสอบไฟล์ Sales History ได้'
      } finally { this.isLoading = false }
    },
    openDocument(documentNumber) { this.selectedDocumentNumber = documentNumber; this.documentDialogVisible = true },
    requestImportConfirmation() {
      if (this.isImporting || !this.preview?.isValid || this.importResult) return
      this.$confirm.require({ header: 'ยืนยัน Import Sales History',
        message: `ระบบจะบันทึก ${this.preview.summary.totalRows} รายการ ต้องการดำเนินการต่อหรือไม่`,
        icon: 'pi pi-exclamation-triangle', rejectLabel: 'ยกเลิก', acceptLabel: 'ยืนยัน Import',
        accept: () => { this.$confirm.close(); void this.confirmImport() } })
    },
    async confirmImport() {
      if (this.isImporting) return
      this.isImporting = true; this.requestError = ''
      try { this.importResult = await confirmSalesHistoryFile(this.selectedFile, this.preview.previewId); this.$emit('imported', this.importResult) }
      catch (error) { console.error('Unable to import Sales History', error); this.requestError = error.message || 'ไม่สามารถ Import Sales History ได้' }
      finally { this.isImporting = false }
    },
    changeLabel(type) { return { create: 'สร้างใหม่', update: 'อัปเดต', unchanged: 'ไม่เปลี่ยนแปลง' }[type] || type },
    changeSeverity(type) { return { create: 'success', update: 'warn', unchanged: 'secondary' }[type] || 'secondary' },
    formatFileSize(bytes) { return `${(bytes / 1024).toFixed(1)} KB` },
    formatDate(value) { return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) },
    formatDateTime(value) { return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) },
    formatMoney(value) { return value == null ? '—' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(value) }
  }
}
</script>

<style scoped></style>
