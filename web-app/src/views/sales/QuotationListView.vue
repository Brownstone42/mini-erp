<template>
  <section>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-primary-600">Sales</p>
        <h2 class="mt-1 text-3xl font-semibold tracking-tight">Quotation</h2>
        <p class="mt-2 text-sm text-surface-500">ประวัติใบเสนอราคาที่ออกแล้วและดาวน์โหลด PDF ซ้ำจากข้อมูลเดิม</p>
      </div>
      <Button label="ออกใบเสนอราคาใหม่" icon="pi pi-plus" @click="$router.push({ name: 'quotation-create' })" />
    </div>

    <Message v-if="loadError" severity="error" class="mt-5">{{ loadError }}</Message>

    <div class="mt-6 grid gap-4 sm:grid-cols-3">
      <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-surface-500">ใบเสนอราคาทั้งหมด</p>
        <p class="mt-1 text-2xl font-semibold">{{ quotations.length.toLocaleString('th-TH') }}</p>
      </div>
      <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-surface-500">วันที่เอกสารล่าสุด</p>
        <p class="mt-1 text-2xl font-semibold">{{ latestQuotationDate }}</p>
      </div>
      <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-surface-500">ยอดรวมใบเสนอราคา</p>
        <p class="mt-1 text-2xl font-semibold text-primary-700">{{ money(totalQuotedAmount) }}</p>
      </div>
    </div>

    <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-semibold">ประวัติใบเสนอราคา</h3>
          <p class="mt-1 text-sm text-surface-500">ค้นหาด้วยเลขที่เอกสารหรือชื่อลูกค้า</p>
        </div>
        <div class="relative w-full sm:w-80">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <InputText v-model="searchText" class="w-full pl-10" placeholder="ค้นหาเลขที่หรือชื่อลูกค้า" />
        </div>
      </div>

      <DataTable
        :value="filteredQuotations"
        :loading="loading"
        paginator
        :rows="20"
        :rows-per-page-options="[20, 50, 100]"
        data-key="quotationNumber"
        striped-rows
        class="quotation-table"
        @row-click="openQuotation($event.data)"
      >
        <Column field="quotationNumber" header="เลขที่ใบเสนอราคา" sortable style="width: 12rem">
          <template #body="slotProps"><span class="font-semibold text-primary-700">{{ slotProps.data.quotationNumber }}</span></template>
        </Column>
        <Column field="quotationDate" header="วันที่" sortable style="width: 10rem">
          <template #body="slotProps">{{ displayDate(slotProps.data.quotationDate) }}</template>
        </Column>
        <Column field="customerName" header="ลูกค้า" sortable />
        <Column field="totalAmount" header="ยอดรวม" sortable style="width: 12rem">
          <template #body="slotProps"><div class="text-right font-semibold">{{ money(slotProps.data.totalAmount) }}</div></template>
        </Column>
        <Column field="createdAt" header="สร้างเมื่อ" sortable style="width: 12rem">
          <template #body="slotProps">{{ displayDateTime(slotProps.data.createdAt) }}</template>
        </Column>
        <Column header="" style="width: 12rem">
          <template #body="slotProps">
            <Button label="Generate PDF" icon="pi pi-file-pdf" size="small" outlined :loading="generatingNumber === slotProps.data.quotationNumber" @click.stop="regenerate(slotProps.data)" />
          </template>
        </Column>
        <template #empty><div class="py-8 text-center text-surface-500">ไม่พบประวัติใบเสนอราคา</div></template>
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
import { fetchQuotations } from '../../services/quotation-data.js'

export default {
  name: 'QuotationListView',
  components: { Button, Column, DataTable, InputText, Message },
  data() {
    return { quotations: [], searchText: '', loading: false, loadError: '', generatingNumber: '' }
  },
  computed: {
    filteredQuotations() {
      const keyword = this.searchText.trim().toLocaleLowerCase('th-TH')
      if (!keyword) return this.quotations
      return this.quotations.filter((item) => [item.quotationNumber, item.customerName, item.customerCode]
        .some((value) => String(value || '').toLocaleLowerCase('th-TH').includes(keyword)))
    },
    latestQuotationDate() {
      if (!this.quotations.length) return '—'
      const latest = this.quotations.reduce((current, item) => item.quotationDate > current ? item.quotationDate : current, '')
      return this.displayDate(latest)
    },
    totalQuotedAmount() {
      return this.quotations.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0)
    }
  },
  mounted() { void this.loadQuotations() },
  methods: {
    async loadQuotations() {
      this.loading = true
      this.loadError = ''
      try { this.quotations = await fetchQuotations() }
      catch (error) {
        console.error(error)
        this.loadError = 'ไม่สามารถโหลดประวัติใบเสนอราคาได้ กรุณา Deploy Data Connect connector รุ่นล่าสุด'
      } finally { this.loading = false }
    },
    openQuotation(item) {
      void this.$router.push({ name: 'quotation-detail', params: { quotationNumber: item.quotationNumber } })
    },
    regenerate(item) {
      this.generatingNumber = item.quotationNumber
      void this.$router.push({ name: 'quotation-detail', params: { quotationNumber: item.quotationNumber }, query: { download: '1' } })
    },
    displayDate(value) {
      if (!value) return '—'
      const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
      return new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day))
    },
    displayDateTime(value) {
      if (!value) return '—'
      return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    },
    money(value) {
      return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2 }).format(Number(value) || 0)
    }
  }
}
</script>

<style scoped>
.quotation-table :deep(.p-datatable-tbody > tr) { cursor: pointer; }
</style>
