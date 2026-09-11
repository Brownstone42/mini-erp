<template>
  <section>
    <div>
      <p class="text-sm font-medium text-primary-600">Settings</p>
      <h2 class="mt-1 text-3xl font-semibold tracking-tight">กรรมการลงนาม</h2>
      <p class="mt-2 text-sm text-surface-500">จัดเก็บข้อมูลผู้ลงนาม ลายเซ็น และตราประทับสำหรับใช้กับเอกสารในอนาคต</p>
    </div>

    <Message v-if="error" severity="error" class="mt-5">{{ error }}</Message>
    <Message v-if="message" severity="success" class="mt-5">{{ message }}</Message>

    <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <h3 class="font-semibold">เพิ่มกรรมการลงนาม</h3>
      <div class="mt-4 grid gap-4 lg:grid-cols-3">
        <label class="block">
          <span class="mb-2 block text-sm font-medium text-surface-600">ชื่อ-นามสกุล *</span>
          <InputText v-model="form.fullName" class="w-full" />
        </label>
        <label class="block">
          <span class="mb-2 block text-sm font-medium text-surface-600">เบอร์โทรศัพท์</span>
          <InputText v-model="form.phoneText" class="w-full" />
        </label>
        <label class="block">
          <span class="mb-2 block text-sm font-medium text-surface-600">Email</span>
          <InputText v-model="form.email" type="email" class="w-full" />
        </label>
      </div>

      <div class="mt-5 grid gap-4 lg:grid-cols-2">
        <div class="upload-card">
          <div>
            <p class="font-medium">รูปลายเซ็น</p>
            <p class="mt-1 text-xs text-surface-500">PNG, JPG หรือ WebP ไม่เกิน 5 MB</p>
          </div>
          <input ref="signatureInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="selectImage($event, 'signature')" />
          <div v-if="signaturePreview" class="image-preview"><img :src="signaturePreview" alt="ตัวอย่างลายเซ็น" /></div>
          <Button :label="signatureFile ? 'เปลี่ยนรูปลายเซ็น' : 'เลือกรูปลายเซ็น'" icon="pi pi-upload" severity="secondary" outlined @click="$refs.signatureInput.click()" />
        </div>

        <div class="upload-card">
          <div>
            <p class="font-medium">ตราประทับบริษัท</p>
            <p class="mt-1 text-xs text-surface-500">PNG, JPG หรือ WebP ไม่เกิน 5 MB</p>
          </div>
          <input ref="stampInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="selectImage($event, 'stamp')" />
          <div v-if="stampPreview" class="image-preview"><img :src="stampPreview" alt="ตัวอย่างตราประทับบริษัท" /></div>
          <Button :label="stampFile ? 'เปลี่ยนรูปตราประทับ' : 'เลือกรูปตราประทับ'" icon="pi pi-upload" severity="secondary" outlined @click="$refs.stampInput.click()" />
        </div>
      </div>

      <div class="mt-5 flex justify-end">
        <Button label="บันทึกกรรมการลงนาม" icon="pi pi-save" :loading="saving" :disabled="!canSave" @click="save" />
      </div>
    </section>

    <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="mb-4"><h3 class="font-semibold">รายการกรรมการลงนาม</h3><p class="mt-1 text-sm text-surface-500">{{ signatories.length.toLocaleString('th-TH') }} รายการ</p></div>
      <DataTable :value="signatories" :loading="loading" striped-rows responsive-layout="scroll">
        <template #empty>ยังไม่มีกรรมการลงนาม</template>
        <Column field="fullName" header="ชื่อ-นามสกุล" sortable style="min-width: 14rem" />
        <Column field="phoneText" header="เบอร์โทรศัพท์" style="min-width: 10rem"><template #body="p">{{ p.data.phoneText || '—' }}</template></Column>
        <Column field="email" header="Email" style="min-width: 14rem"><template #body="p">{{ p.data.email || '—' }}</template></Column>
        <Column header="ลายเซ็น" style="width: 9rem"><template #body="p"><img v-if="p.data.signatureUrl" :src="p.data.signatureUrl" alt="ลายเซ็น" class="table-image" /><span v-else>—</span></template></Column>
        <Column header="ตราประทับ" style="width: 9rem"><template #body="p"><img v-if="p.data.stampUrl" :src="p.data.stampUrl" alt="ตราประทับ" class="table-image" /><span v-else>—</span></template></Column>
        <Column field="isActive" header="สถานะ" sortable style="width: 8rem"><template #body="p"><Tag :value="p.data.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน'" :severity="p.data.isActive ? 'success' : 'secondary'" /></template></Column>
        <Column header="" style="width: 8rem"><template #body="p"><Button :label="p.data.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'" :severity="p.data.isActive ? 'danger' : 'success'" text size="small" @click="toggleActive(p.data)" /></template></Column>
      </DataTable>
    </section>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { createSignatory, fetchSignatories, setSignatoryActive } from '../../services/signatory-data.js'

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export default {
  name: 'SignatoryListView',
  components: { Button, Column, DataTable, InputText, Message, Tag },
  data() {
    return {
      signatories: [], form: { fullName: '', phoneText: '', email: '' },
      signatureFile: null, stampFile: null, signaturePreview: '', stampPreview: '',
      loading: true, saving: false, error: '', message: ''
    }
  },
  computed: {
    canSave() { return Boolean(this.form.fullName.trim()) && !this.saving }
  },
  async mounted() { await this.load() },
  beforeUnmount() { this.revokePreview('signature'); this.revokePreview('stamp'); this.revokeStoredUrls() },
  methods: {
    async load() {
      this.loading = true; this.error = ''
      try {
        const signatories = await fetchSignatories()
        this.revokeStoredUrls()
        this.signatories = signatories
      }
      catch (error) { console.error(error); this.error = 'ไม่สามารถโหลดข้อมูลกรรมการลงนามได้ กรุณา Deploy Data Connect schema ล่าสุด' }
      finally { this.loading = false }
    },
    selectImage(event, kind) {
      const file = event.target.files?.[0]
      if (!file) return
      this.error = ''; this.message = ''
      if (!IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_SIZE) {
        this.error = 'กรุณาเลือกไฟล์ PNG, JPG หรือ WebP ขนาดไม่เกิน 5 MB'
        event.target.value = ''
        return
      }
      this.revokePreview(kind)
      this[`${kind}File`] = file
      this[`${kind}Preview`] = URL.createObjectURL(file)
    },
    revokePreview(kind) {
      const preview = this[`${kind}Preview`]
      if (preview) URL.revokeObjectURL(preview)
      this[`${kind}Preview`] = ''
    },
    revokeStoredUrls() {
      this.signatories.forEach((item) => {
        if (item.signatureUrl) URL.revokeObjectURL(item.signatureUrl)
        if (item.stampUrl) URL.revokeObjectURL(item.stampUrl)
      })
    },
    async save() {
      if (!this.canSave) return
      this.saving = true; this.error = ''; this.message = ''
      try {
        await createSignatory({ ...this.form, signatureFile: this.signatureFile, stampFile: this.stampFile })
        this.message = 'บันทึกกรรมการลงนามแล้ว'
        this.resetForm()
        await this.load()
      } catch (error) { console.error(error); this.error = 'ไม่สามารถบันทึกได้ กรุณาตรวจสอบว่าเปิด Firebase Storage และ Deploy Storage Rules แล้ว' }
      finally { this.saving = false }
    },
    resetForm() {
      this.form = { fullName: '', phoneText: '', email: '' }
      this.signatureFile = null; this.stampFile = null
      this.revokePreview('signature'); this.revokePreview('stamp')
      if (this.$refs.signatureInput) this.$refs.signatureInput.value = ''
      if (this.$refs.stampInput) this.$refs.stampInput.value = ''
    },
    async toggleActive(item) {
      this.error = ''; this.message = ''
      try {
        await setSignatoryActive(item.id, !item.isActive)
        this.message = `เปลี่ยนสถานะ ${item.fullName} แล้ว`
        await this.load()
      } catch (error) { console.error(error); this.error = 'ไม่สามารถเปลี่ยนสถานะกรรมการลงนามได้' }
    }
  }
}
</script>

<style scoped>
.upload-card { display: flex; min-height: 210px; flex-direction: column; align-items: flex-start; gap: 1rem; border: 1px dashed var(--p-surface-300); border-radius: .75rem; padding: 1rem; }
.image-preview { display: grid; width: 100%; min-height: 90px; flex: 1; place-items: center; overflow: hidden; border-radius: .5rem; background: var(--p-surface-50); }
.image-preview img { max-width: 100%; max-height: 150px; object-fit: contain; }
.table-image { width: 86px; height: 54px; object-fit: contain; }
</style>
