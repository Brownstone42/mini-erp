<template>
  <section>
    <Dialog v-model:visible="dialogVisible" modal :header="editing ? 'แก้ไข Unit Mapping' : 'เพิ่ม Unit Mapping'" class="w-full max-w-xl">
      <div class="space-y-4">
        <label class="block">
          <span class="mb-2 block text-sm font-medium">หน่วยที่พบจาก Express</span>
          <InputText v-model="form.sourceUnitText" class="w-full" maxlength="100" :disabled="editing" placeholder="เช่น กล." autofocus />
          <small v-if="editing" class="mt-1 block text-surface-500">หากต้องการเปลี่ยนหน่วยต้นทาง ให้ลบรายการเดิมแล้วเพิ่มใหม่</small>
        </label>
        <label class="block">
          <span class="mb-2 block text-sm font-medium">หน่วยมาตรฐาน</span>
          <InputText v-model="form.standardUnitText" class="w-full" maxlength="100" placeholder="เช่น กล่อง" @keyup.enter="save" />
        </label>
        <label class="block">
          <span class="mb-2 block text-sm font-medium">หมายเหตุ <span class="font-normal text-surface-400">(ไม่บังคับ)</span></span>
          <Textarea v-model="form.noteText" class="w-full" rows="3" maxlength="500" auto-resize />
        </label>
        <Message severity="info" :closable="false">Mapping นี้เปลี่ยนเฉพาะชื่อหน่วย จำนวนจะคงเดิมเสมอ ไม่มีการคูณหรือหาร</Message>
        <Message v-if="formError" severity="error">{{ formError }}</Message>
      </div>
      <template #footer>
        <Button label="ยกเลิก" severity="secondary" text @click="dialogVisible = false" />
        <Button label="บันทึก" icon="pi pi-check" :loading="saving" :disabled="!canSave" @click="save" />
      </template>
    </Dialog>

    <div class="flex items-start justify-between gap-6">
      <div>
        <p class="text-sm font-medium text-primary-600">Master Data</p>
        <h2 class="mt-1 text-3xl font-semibold tracking-tight">Unit Mapping</h2>
        <p class="mt-2 text-sm text-surface-500">จับคู่หน่วยย่อกับชื่อเต็มที่เป็นหน่วยเดียวกัน โดยไม่แปลงจำนวน</p>
      </div>
      <Button label="เพิ่ม Unit Mapping" icon="pi pi-plus" @click="openCreate" />
    </div>

    <Message severity="info" class="mt-5" :closable="false">
      ตัวอย่าง: หาก Stock ใช้ “กล.” แต่ Sales ใช้ “กล่อง” ให้ map “กล.” → “กล่อง” ระบบจะถือว่าเป็นหน่วยเดียวกันแบบ 1:1
    </Message>
    <Message v-if="message" :severity="messageSeverity" class="mt-4">{{ message }}</Message>

    <div class="mt-6 grid gap-4 sm:grid-cols-2">
      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <p class="text-sm text-surface-500">Unit Mapping ทั้งหมด</p>
        <p class="mt-2 text-3xl font-semibold">{{ mappings.length.toLocaleString('th-TH') }}</p>
        <p class="mt-1 text-xs text-surface-400">คู่หน่วย</p>
      </div>
      <div class="rounded-xl border border-surface-200 bg-white p-5">
        <p class="text-sm text-surface-500">หน่วยมาตรฐาน</p>
        <p class="mt-2 text-3xl font-semibold">{{ standardUnitCount.toLocaleString('th-TH') }}</p>
        <p class="mt-1 text-xs text-surface-400">หน่วย</p>
      </div>
    </div>

    <div class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <label class="block max-w-md">
        <span class="mb-2 block text-sm font-medium text-surface-600">ค้นหาหน่วย</span>
        <IconField><InputIcon class="pi pi-search" /><InputText v-model="searchTerm" class="w-full" placeholder="หน่วยที่พบ หน่วยมาตรฐาน หรือหมายเหตุ" /></IconField>
      </label>
    </div>

    <div class="mt-6 rounded-xl border border-surface-200 bg-white shadow-sm">
      <DataTable :value="filteredMappings" :loading="loading" data-key="sourceUnitKey" striped-rows paginator :rows="25" :rows-per-page-options="[25, 50, 100]">
        <template #empty><div class="py-10 text-center text-surface-500">{{ loadError || 'ยังไม่มี Unit Mapping' }}</div></template>
        <Column field="sourceUnitText" header="หน่วยที่พบ" sortable style="min-width: 13rem" />
        <Column header="" style="width: 5rem"><template #body><i class="pi pi-arrow-right text-surface-400" /></template></Column>
        <Column field="standardUnitText" header="หน่วยมาตรฐาน" sortable style="min-width: 13rem" />
        <Column field="noteText" header="หมายเหตุ" style="min-width: 16rem"><template #body="p">{{ p.data.noteText || '—' }}</template></Column>
        <Column header="อัปเดตล่าสุด" style="width: 13rem"><template #body="p">{{ dateTime(p.data.updatedAt) }}</template></Column>
        <Column header="" style="width: 8rem">
          <template #body="p">
            <div class="flex justify-end gap-1">
              <Button icon="pi pi-pencil" severity="secondary" text rounded aria-label="แก้ไข" @click="openEdit(p.data)" />
              <Button icon="pi pi-trash" severity="danger" text rounded aria-label="ลบ" @click="confirmDelete(p.data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import { deleteUnitMapping, fetchUnitMappings, saveUnitMapping } from '../../../services/unit-mapping-data.js'

const emptyForm = () => ({ sourceUnitKey: '', sourceUnitText: '', standardUnitText: '', noteText: '' })

export default {
  name: 'UnitMappingListView',
  components: { Button, Column, DataTable, Dialog, IconField, InputIcon, InputText, Message, Textarea },
  data() {
    return {
      mappings: [], loading: true, loadError: '', searchTerm: '', dialogVisible: false,
      editing: false, saving: false, form: emptyForm(), formError: '', message: '', messageSeverity: 'success'
    }
  },
  computed: {
    canSave() { return Boolean(this.form.sourceUnitText.trim() && this.form.standardUnitText.trim() && !this.saving) },
    standardUnitCount() { return new Set(this.mappings.map((item) => item.standardUnitText.trim().toLocaleLowerCase('th-TH'))).size },
    filteredMappings() {
      const term = this.searchTerm.trim().toLocaleLowerCase('th-TH')
      if (!term) return this.mappings
      return this.mappings.filter((item) => [item.sourceUnitText, item.standardUnitText, item.noteText].some((value) => String(value || '').toLocaleLowerCase('th-TH').includes(term)))
    }
  },
  async mounted() { await this.load() },
  methods: {
    async load() {
      this.loading = true; this.loadError = ''
      try { this.mappings = await fetchUnitMappings() }
      catch (error) { console.error(error); this.loadError = 'ไม่สามารถโหลด Unit Mapping ได้' }
      finally { this.loading = false }
    },
    openCreate() { this.editing = false; this.form = emptyForm(); this.formError = ''; this.dialogVisible = true },
    openEdit(item) { this.editing = true; this.form = { ...item, noteText: item.noteText || '' }; this.formError = ''; this.dialogVisible = true },
    async save() {
      if (!this.canSave) return
      this.saving = true; this.formError = ''
      try {
        await saveUnitMapping(this.form)
        this.dialogVisible = false
        await this.load()
        this.message = 'บันทึก Unit Mapping แล้ว'; this.messageSeverity = 'success'
      } catch (error) {
        console.error(error); this.formError = 'ไม่สามารถบันทึกได้ กรุณาตรวจสอบว่าหน่วยต้นทางไม่ซ้ำ'
      } finally { this.saving = false }
    },
    confirmDelete(item) {
      this.$confirm.require({
        header: 'ลบ Unit Mapping',
        message: `ต้องการลบ ${item.sourceUnitText} → ${item.standardUnitText} หรือไม่`,
        icon: 'pi pi-exclamation-triangle', rejectLabel: 'ยกเลิก', acceptLabel: 'ลบ', acceptClass: 'p-button-danger',
        accept: () => { this.$confirm.close(); void this.remove(item) }
      })
    },
    async remove(item) {
      try {
        await deleteUnitMapping(item.sourceUnitKey)
        await this.load()
        this.message = 'ลบ Unit Mapping แล้ว'; this.messageSeverity = 'success'
      } catch (error) { console.error(error); this.message = 'ไม่สามารถลบ Unit Mapping ได้'; this.messageSeverity = 'error' }
    },
    dateTime(value) { return value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—' }
  }
}
</script>

