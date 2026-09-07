<template>
  <section>
    <ConfirmDialog />
    <div v-if="isImporting" class="fixed inset-0 z-[9999] grid place-items-center bg-surface-900/45 px-4" aria-live="assertive">
      <div class="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
        <ProgressSpinner class="h-14 w-14" stroke-width="5" />
        <h3 class="mt-5 text-lg font-semibold">กำลัง Import Customer</h3>
        <p class="mt-2 text-sm text-surface-500">กรุณารอจนกว่าระบบจะทำครบทั้ง 1,049 รายการ และอย่าปิดหน้านี้</p>
      </div>
    </div>
    <div>
      <p class="text-sm font-medium text-primary-600">Master Data · Customer</p>
      <h2 class="mt-1 text-3xl font-semibold tracking-tight">Import from Express</h2>
      <p class="mt-2 text-sm text-surface-500">อัปโหลด Customer แบบ Full Snapshot เพื่อตรวจสอบก่อนยืนยัน</p>
    </div>

    <Message severity="warn" class="mt-6 max-w-5xl">
      ไฟล์ต้องมี Customer ครบทั้งหมดจาก Express หากรหัสเดิมหายไป Customer นั้นจะถูกเปลี่ยนเป็นไม่ใช้งานเมื่อยืนยัน Import
    </Message>

    <section class="mt-6 max-w-5xl rounded-xl border border-surface-200 bg-white p-8 shadow-sm">
      <div class="rounded-xl border-2 border-dashed border-surface-300 bg-surface-50 p-10 text-center">
        <i class="pi pi-file-arrow-up text-4xl text-primary-500" />
        <h3 class="mt-4 text-lg font-semibold">เลือกไฟล์ CSV Customer จาก Express</h3>
        <p class="mt-2 text-sm text-surface-500">รองรับไฟล์ Windows-874 ขนาดไม่เกิน 2 MB</p>
        <FileUpload
          mode="basic"
          name="customerFile"
          accept=".csv,text/csv"
          choose-label="เลือกไฟล์ CSV"
          choose-icon="pi pi-folder-open"
          custom-upload
          class="mt-6"
          :disabled="isLoading || isImporting"
          @select="selectFile"
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

    <section v-if="preview" class="mt-6 max-w-6xl space-y-6">
      <Message :severity="preview.isValid ? 'success' : 'error'">
        {{ preview.isValid ? 'ไฟล์ผ่านการตรวจสอบ ข้อมูลยังไม่ได้ถูกบันทึก' : 'พบข้อผิดพลาด จึงยังไม่สามารถนำเข้าข้อมูลได้' }}
      </Message>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div v-for="item in summaryCards" :key="item.label" class="rounded-xl border border-surface-200 bg-white p-4">
          <p class="text-xs text-surface-500">{{ item.label }}</p>
          <p class="mt-1 text-2xl font-semibold">{{ item.value }}</p>
        </div>
      </div>

      <div v-if="preview.errors.length" class="rounded-xl border border-red-200 bg-white p-5">
        <h3 class="font-semibold text-red-700">รายการที่ต้องแก้ไขใน Express</h3>
        <ul class="mt-3 space-y-2 text-sm">
          <li v-for="(error, index) in preview.errors" :key="index">บรรทัด {{ error.rowNumber || '-' }}: {{ error.message }}</li>
        </ul>
      </div>

      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <h3 class="font-semibold">ข้อมูล Customer จากไฟล์</h3>
        <DataTable :value="preview.rows" paginator :rows="20" class="mt-4" striped-rows>
          <Column field="customerCode" header="รหัส" style="width: 9rem" />
          <Column field="customerName" header="ชื่อ Customer" />
          <Column field="taxId" header="เลขผู้เสียภาษี" style="width: 14rem" />
          <Column field="creditDays" header="เครดิต (วัน)" style="width: 8rem" />
          <Column header="ผลที่จะเกิดขึ้น" style="width: 11rem">
            <template #body="slotProps">
              <Tag :value="changeLabel(slotProps.data.changeType)" :severity="changeSeverity(slotProps.data.changeType)" />
            </template>
          </Column>
        </DataTable>
      </div>

      <div v-if="preview.isValid && !importResult" class="flex justify-end rounded-xl border border-surface-200 bg-white p-5">
        <Button label="ยืนยัน Import Customer" icon="pi pi-check" :loading="isImporting" :disabled="isImporting" @click="requestImportConfirmation" />
      </div>

      <Message v-if="importResult" severity="success">
        {{ importResult.alreadyImported ? 'ไฟล์นี้เคย Import สำเร็จแล้ว' : 'Import Customer สำเร็จ' }}
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
import FileUpload from 'primevue/fileupload'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import { confirmCustomerFile, previewCustomerFile } from '../../../services/customer-import.js'

export default {
  name: 'CustomerImportView',
  components: { Button, Column, ConfirmDialog, DataTable, FileUpload, Message, ProgressSpinner, Tag },
  data() {
    return {
      selectedFile: null,
      preview: null,
      importResult: null,
      isLoading: false,
      isImporting: false,
      requestError: ''
    }
  },
  computed: {
    summaryCards() {
      const summary = this.preview?.summary
      if (!summary) return []
      return [
        { label: 'ทั้งหมด', value: summary.totalRows },
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
        this.preview = await previewCustomerFile(this.selectedFile)
      } catch (error) {
        console.error('Unable to preview customer file', error)
        this.requestError = error.message || 'ไม่สามารถตรวจสอบไฟล์ Customer ได้'
      } finally {
        this.isLoading = false
      }
    },
    requestImportConfirmation() {
      if (this.isImporting || !this.preview?.isValid || this.importResult) return
      this.$confirm.require({
        header: 'ยืนยัน Import Customer',
        message: `ระบบจะนำเข้า Customer ${this.preview.summary.totalRows} รายการ และปิดใช้งาน ${this.preview.summary.deactivateCount} รายการ ต้องการดำเนินการต่อหรือไม่`,
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
        this.importResult = await confirmCustomerFile(this.selectedFile, this.preview.previewId)
      } catch (error) {
        console.error('Unable to import customers', error)
        this.requestError = error.message || 'ไม่สามารถ Import Customer ได้'
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
