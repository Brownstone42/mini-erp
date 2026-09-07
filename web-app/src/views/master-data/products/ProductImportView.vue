<template>
  <section>
    <ConfirmDialog />
    <div v-if="isImporting" class="fixed inset-0 z-[9999] grid place-items-center bg-surface-900/45 px-4" aria-live="assertive">
      <div class="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
        <ProgressSpinner class="h-14 w-14" stroke-width="5" />
        <h3 class="mt-5 text-lg font-semibold">กำลัง Import Product</h3>
        <p class="mt-2 text-sm text-surface-500">กรุณารอจนกว่าระบบจะบันทึกสินค้าและหมวดสินค้าครบทั้งหมด และอย่าปิดหน้านี้</p>
      </div>
    </div>
    <div>
      <p class="text-sm font-medium text-primary-600">Master Data · Product</p>
      <h2 class="mt-1 text-3xl font-semibold tracking-tight">Import from Express</h2>
      <p class="mt-2 text-sm text-surface-500">อัปโหลด Product และ Product Category แบบ Full Snapshot เพื่อตรวจสอบก่อนยืนยัน</p>
    </div>

    <Message severity="warn" class="mt-6 max-w-5xl">
      ไฟล์ต้องมีสินค้าครบทั้งหมดจาก Express สินค้าที่หายจากไฟล์จะถูกเปลี่ยนเป็นไม่ใช้งานเมื่อยืนยัน Import
    </Message>

    <section class="mt-6 max-w-5xl rounded-xl border border-surface-200 bg-white p-8 shadow-sm">
      <div class="rounded-xl border-2 border-dashed border-surface-300 bg-surface-50 p-10 text-center">
        <i class="pi pi-file-arrow-up text-4xl text-primary-500" />
        <h3 class="mt-4 text-lg font-semibold">เลือกไฟล์ CSV Product จาก Express</h3>
        <p class="mt-2 text-sm text-surface-500">รองรับรายงานรายละเอียดสินค้า Windows-874 ขนาดไม่เกิน 2 MB</p>
        <FileUpload
          mode="basic" name="productFile" accept=".csv,text/csv"
          choose-label="เลือกไฟล์ CSV" choose-icon="pi pi-folder-open"
          custom-upload class="mt-6" :disabled="isLoading || isImporting" @select="selectFile"
        />
      </div>

      <div v-if="selectedFile" class="mt-6 flex items-center justify-between rounded-lg border border-surface-200 p-4">
        <div class="flex items-center gap-3">
          <i class="pi pi-file text-xl text-primary-500" />
          <div>
            <p class="text-sm font-medium">{{ selectedFile.name }}</p>
            <p class="text-xs text-surface-500">{{ formatFileSize(selectedFile.size) }}</p>
          </div>
        </div>
        <Button label="ตรวจสอบไฟล์" icon="pi pi-search" :loading="isLoading" :disabled="isImporting" @click="previewFile" />
      </div>
      <Message v-if="requestError" severity="error" class="mt-4">{{ requestError }}</Message>
    </section>

    <section v-if="preview" class="mt-6 max-w-7xl space-y-6">
      <Message :severity="preview.isValid ? 'success' : 'error'">
        {{ preview.isValid ? 'ไฟล์ผ่านการตรวจสอบ ข้อมูลยังไม่ได้ถูกบันทึก' : 'พบข้อผิดพลาด จึงยังไม่สามารถนำเข้าข้อมูลได้' }}
      </Message>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <div v-for="item in summaryCards" :key="item.label" class="rounded-xl border border-surface-200 bg-white p-4">
          <p class="text-xs text-surface-500">{{ item.label }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ item.value }}</p>
        </div>
      </div>

      <div v-if="preview.errors.length" class="rounded-xl border border-red-200 bg-white p-5">
        <h3 class="font-semibold text-red-700">รายการที่ต้องแก้ไขก่อน Import</h3>
        <ul class="mt-3 space-y-2 text-sm">
          <li v-for="(error, index) in preview.errors" :key="index">บรรทัด {{ error.rowNumber || '-' }}: {{ error.message }}</li>
        </ul>
      </div>

      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <h3 class="font-semibold">Product Category จากไฟล์</h3>
        <DataTable :value="preview.categories" class="mt-4" striped-rows>
          <Column field="categoryCode" header="รหัสหมวด" style="width: 10rem" />
          <Column field="categoryName" header="ชื่อหมวด" />
          <Column header="ผลที่จะเกิดขึ้น" style="width: 12rem">
            <template #body="slotProps"><Tag :value="changeLabel(slotProps.data.changeType)" :severity="changeSeverity(slotProps.data.changeType)" /></template>
          </Column>
        </DataTable>
      </div>

      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <h3 class="font-semibold">Product จากไฟล์</h3>
        <DataTable :value="preview.rows" paginator :rows="20" class="mt-4" striped-rows>
          <Column field="productCode" header="รหัสสินค้า" style="width: 15rem" />
          <Column field="productName" header="ชื่อสินค้า" />
          <Column field="categoryCode" header="หมวด" style="width: 7rem" />
          <Column field="smallUnit" header="หน่วย" style="width: 7rem" />
          <Column field="supplierCode" header="Supplier" style="width: 9rem" />
          <Column header="ผลที่จะเกิดขึ้น" style="width: 12rem">
            <template #body="slotProps"><Tag :value="changeLabel(slotProps.data.changeType)" :severity="changeSeverity(slotProps.data.changeType)" /></template>
          </Column>
        </DataTable>
      </div>

      <div v-if="preview.isValid && !importResult" class="flex justify-end rounded-xl border border-surface-200 bg-white p-5">
        <Button label="ยืนยัน Import Product" icon="pi pi-check" :loading="isImporting" :disabled="isImporting" @click="requestImportConfirmation" />
      </div>
      <Message v-if="importResult" severity="success">
        {{ importResult.alreadyImported ? 'ไฟล์นี้เคย Import สำเร็จแล้ว' : 'Import Product สำเร็จ' }}
        {{ importResult.summary.totalRows }} รายการ และ {{ importResult.summary.categoryRows }} หมวด เมื่อ {{ formatDateTime(importResult.importedAt) }}
      </Message>
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
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import { confirmProductFile, previewProductFile } from '../../../services/product-import.js'

export default {
  name: 'ProductImportView',
  components: { Button, Column, ConfirmDialog, DataTable, FileUpload, Message, ProgressSpinner, Tag },
  data() {
    return { selectedFile: null, preview: null, importResult: null, isLoading: false, isImporting: false, requestError: '' }
  },
  computed: {
    summaryCards() {
      const summary = this.preview?.summary
      if (!summary) return []
      return [
        { label: 'สินค้าทั้งหมด', value: summary.totalRows },
        { label: 'หมวดสินค้า', value: summary.categoryRows },
        { label: 'สร้างใหม่', value: summary.createCount },
        { label: 'อัปเดต', value: summary.updateCount },
        { label: 'เปิดใช้อีกครั้ง', value: summary.reactivateCount },
        { label: 'ไม่เปลี่ยนแปลง', value: summary.unchangedCount },
        { label: 'จะปิดใช้งาน', value: summary.deactivateCount }
      ]
    }
  },
  methods: {
    selectFile(event) {
      this.selectedFile = event.files[0] || null
      this.preview = null
      this.importResult = null
      this.requestError = ''
    },
    async previewFile() {
      if (!this.selectedFile || this.isLoading) return
      this.isLoading = true
      this.preview = null
      this.importResult = null
      this.requestError = ''
      try {
        this.preview = await previewProductFile(this.selectedFile)
      } catch (error) {
        console.error('Unable to preview Product file', error)
        this.requestError = error.message || 'ไม่สามารถตรวจสอบไฟล์ Product ได้'
      } finally {
        this.isLoading = false
      }
    },
    requestImportConfirmation() {
      if (this.isImporting || !this.preview?.isValid || this.importResult) return
      this.$confirm.require({
        header: 'ยืนยัน Import Product',
        message: `ระบบจะนำเข้าสินค้า ${this.preview.summary.totalRows} รายการ และหมวดสินค้า ${this.preview.summary.categoryRows} หมวด ต้องการดำเนินการต่อหรือไม่`,
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'ยกเลิก',
        acceptLabel: 'ยืนยัน Import',
        accept: () => {
          this.$confirm.close()
          void this.confirmImport()
        }
      })
    },
    async confirmImport() {
      if (this.isImporting) return
      this.isImporting = true
      this.requestError = ''
      try {
        this.importResult = await confirmProductFile(this.selectedFile, this.preview.previewId)
      } catch (error) {
        console.error('Unable to import Product', error)
        this.requestError = error.message || 'ไม่สามารถ Import Product ได้'
      } finally {
        this.isImporting = false
      }
    },
    changeLabel(type) {
      return { create: 'สร้างใหม่', update: 'อัปเดต', reactivate: 'เปิดใช้อีกครั้ง', unchanged: 'ไม่เปลี่ยนแปลง' }[type] || type
    },
    changeSeverity(type) {
      return { create: 'success', update: 'warn', reactivate: 'info', unchanged: 'secondary' }[type] || 'secondary'
    },
    formatFileSize(bytes) {
      return `${(bytes / 1024).toFixed(1)} KB`
    },
    formatDateTime(value) {
      return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    }
  }
}
</script>

<style scoped></style>
