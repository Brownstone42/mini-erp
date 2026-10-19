<template>
  <section>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-primary-600">Transaction Data</p>
        <h2 class="mt-1 text-3xl font-semibold">Pending Orders</h2>
        <p class="mt-2 text-sm text-surface-500">สินค้าค้างส่งตามใบสั่งขายจาก Express</p>
      </div>
      <Button :label="importVisible ? 'ปิดส่วนนำเข้าข้อมูล' : 'นำเข้าข้อมูล'" :icon="importVisible ? 'pi pi-chevron-up' : 'pi pi-upload'" :severity="importVisible ? 'secondary' : 'primary'" @click="importVisible = !importVisible" />
    </div>

    <div v-if="importVisible" class="mt-6 rounded-xl border border-primary-200 bg-primary-50/30 p-6">
      <PendingOrdersImportView @imported="handleImported" />
    </div>

    <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-end gap-4">
        <label class="block min-w-80">
          <span class="mb-2 block text-sm font-medium text-surface-600">ชุดข้อมูล</span>
          <Select v-model="selectedSnapshotId" :options="snapshotOptions" option-label="label" option-value="value" placeholder="เลือก Snapshot" class="w-full" @change="loadDetails" />
        </label>
        <label class="block min-w-72 flex-1">
          <span class="mb-2 block text-sm font-medium text-surface-600">ค้นหารายการ</span>
          <InputText v-model="searchTerm" class="w-full" placeholder="รหัสสินค้า ชื่อสินค้า ลูกค้า หรือเลขใบสั่งขาย" />
        </label>
      </div>
    </section>

    <template v-if="activeSnapshot">
      <Message v-if="activeSnapshot.periodEnd < activeSnapshot.reportDate" severity="warn" class="mt-5">
        ช่วงวันที่ส่งของสิ้นสุด {{ date(activeSnapshot.periodEnd) }} ก่อนวันที่พิมพ์รายงาน {{ date(activeSnapshot.reportDate) }} ข้อมูลชุดนี้อาจไม่ครอบคลุมรายการกำหนดส่งหลังจากนั้น
      </Message>
      <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">รายการค้างส่ง</p><p class="mt-2 text-3xl font-semibold">{{ activeSnapshot.lineCount.toLocaleString('th-TH') }}</p></div>
        <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">สินค้า</p><p class="mt-2 text-3xl font-semibold">{{ activeSnapshot.productCount.toLocaleString('th-TH') }}</p></div>
        <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">ส่งของวันที่</p><p class="mt-2 text-base font-semibold">{{ date(activeSnapshot.periodStart) }} – {{ date(activeSnapshot.periodEnd) }}</p></div>
        <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">หน่วยต่างจากยอดในมือ</p><p class="mt-2 text-3xl font-semibold">{{ activeSnapshot.unitMismatchCount.toLocaleString('th-TH') }}</p></div>
      </div>
      <p class="mt-4 text-sm text-surface-500">พิมพ์รายงาน {{ date(activeSnapshot.reportDate) }} · คลัง {{ activeSnapshot.warehouseFrom }} ถึง {{ activeSnapshot.warehouseTo }} · ลูกค้า {{ activeSnapshot.customerFrom || 'ต้นช่วง' }} ถึง {{ activeSnapshot.customerTo || 'ปลายช่วง' }} · ไฟล์ {{ activeSnapshot.sourceFileName }}</p>
    </template>

    <div class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <DataTable :value="filteredRows" :loading="loading || loadingDetails" paginator :rows="25" :rows-per-page-options="[25, 50, 100]" striped-rows>
        <template #empty>{{ error || (activeSnapshot ? 'ไม่พบรายการที่ตรงกับคำค้น' : 'ยังไม่มีข้อมูล Pending Orders') }}</template>
        <Column field="productCode" header="รหัสสินค้า" sortable />
        <Column field="sourceProductName" header="ชื่อสินค้า" sortable />
        <Column field="customerName" header="ลูกค้า" sortable />
        <Column field="documentNumber" header="ใบสั่งขาย" sortable />
        <Column field="deliveryDate" header="กำหนดส่ง" sortable><template #body="p">{{ date(p.data.deliveryDate) }}</template></Column>
        <Column field="pendingQuantity" header="ค้างส่ง" sortable><template #body="p">{{ quantity(p.data.pendingQuantity) }}</template></Column>
        <Column field="sourceUnitText" header="หน่วย" />
      </DataTable>
    </div>
    <Message v-if="error" severity="error" class="mt-4">{{ error }}</Message>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import { fetchPendingOrderSnapshotDetails, fetchPendingOrderSnapshots } from '../../services/pending-orders-data.js'
import PendingOrdersImportView from './PendingOrdersImportView.vue'

export default {
  name: 'PendingOrdersView',
  components: { Button, Column, DataTable, InputText, Message, PendingOrdersImportView, Select },
  data() { return { snapshots: [], rows: [], selectedSnapshotId: null, searchTerm: '', importVisible: this.$route.query.import === '1', loading: true, loadingDetails: false, error: '' } },
  computed: {
    activeSnapshot() { return this.snapshots.find((item) => item.id === this.selectedSnapshotId) || null },
    snapshotOptions() { return this.snapshots.map((item) => ({ value: item.id, label: `${this.date(item.reportDate)} · ส่งของถึง ${this.date(item.periodEnd)} · ${item.lineCount} รายการ` })) },
    filteredRows() {
      const keyword = this.searchTerm.trim().toLocaleLowerCase('th-TH')
      if (!keyword) return this.rows
      return this.rows.filter((row) => [row.productCode, row.sourceProductName, row.customerName, row.documentNumber].some((value) => String(value || '').toLocaleLowerCase('th-TH').includes(keyword)))
    }
  },
  mounted() { void this.loadSnapshots() },
  methods: {
    async loadSnapshots(preferredId = null) {
      this.loading = true; this.error = ''
      try {
        this.snapshots = await fetchPendingOrderSnapshots()
        const selected = preferredId || this.selectedSnapshotId
        this.selectedSnapshotId = this.snapshots.some((item) => item.id === selected) ? selected : this.snapshots[0]?.id || null
        await this.loadDetails()
      } catch (error) { console.error(error); this.error = 'ไม่สามารถโหลด Pending Orders ได้' } finally { this.loading = false }
    },
    async loadDetails() {
      if (!this.selectedSnapshotId) { this.rows = []; return }
      this.loadingDetails = true; this.error = ''
      try { this.rows = (await fetchPendingOrderSnapshotDetails(this.selectedSnapshotId)).rows }
      catch (error) { console.error(error); this.error = 'ไม่สามารถโหลดรายการสินค้าค้างส่งได้' }
      finally { this.loadingDetails = false }
    },
    async handleImported(result) { this.importVisible = false; await this.loadSnapshots(result.snapshotId) },
    date(value) { return value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : '—' },
    quantity(value) { return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 }).format(value || 0) }
  }
}
</script>

<style scoped></style>
