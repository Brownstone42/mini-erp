<template>
  <section>
    <Dialog v-model:visible="lotDialogVisible" modal :header="`รายละเอียด Lot · ${selectedProduct?.productCode || ''}`" class="w-full max-w-5xl">
      <p v-if="selectedProduct" class="mb-4 text-sm text-surface-500">{{ selectedProduct.productName }}</p>
      <DataTable :value="selectedLots" paginator :rows="25" striped-rows>
        <template #empty>ไม่พบรายละเอียด Lot</template>
        <Column field="receivedDate" header="วันที่รับ" sortable><template #body="p">{{ date(p.data.receivedDate) }}</template></Column>
        <Column field="lotReference" header="เลขที่ Lot" />
        <Column field="quantity" header="จำนวน"><template #body="p">{{ quantity(p.data.quantity) }}</template></Column>
        <Column field="unitCost" header="ต้นทุน/หน่วย"><template #body="p">{{ nullableMoney(p.data.unitCost) }}</template></Column>
        <Column field="inventoryValue" header="มูลค่า"><template #body="p">{{ nullableMoney(p.data.inventoryValue) }}</template></Column>
      </DataTable>
    </Dialog>

    <div class="flex items-end justify-between gap-6">
      <div><p class="text-sm font-medium text-primary-600">Transaction Data</p><h2 class="mt-1 text-3xl font-semibold">Stock</h2><p class="mt-2 text-sm text-surface-500">ยอดสินค้าคงเหลือแบบ Snapshot จาก Express</p></div>
      <Button :label="importVisible ? 'ปิดส่วนนำเข้าข้อมูล' : 'นำเข้าข้อมูล'" :icon="importVisible ? 'pi pi-chevron-up' : 'pi pi-upload'" :severity="importVisible ? 'secondary' : 'primary'" @click="importVisible = !importVisible" />
    </div>
    <div v-if="importVisible" class="mt-6 rounded-xl border border-primary-200 bg-primary-50/30 p-6"><StockImportView @imported="handleImported" /></div>

    <section class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-end gap-4">
        <label class="block min-w-80"><span class="mb-2 block text-sm font-medium text-surface-600">Snapshot</span><Select v-model="selectedSnapshotKey" :options="snapshotOptions" option-label="label" option-value="value" placeholder="เลือก Snapshot" class="w-full" /></label>
        <label class="block min-w-72"><span class="mb-2 block text-sm font-medium text-surface-600">ค้นหาสินค้า</span><InputText v-model="searchTerm" class="w-full" placeholder="ชื่อหรือรหัสสินค้า" /></label>
      </div>
    </section>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">สินค้าใน Snapshot</p><p class="mt-2 text-3xl font-semibold">{{ filteredRows.length.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">รายการสินค้า</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">มูลค่าคงเหลือ</p><p class="mt-2 text-3xl font-semibold">{{ money(totalValue) }}</p><p class="mt-1 text-xs text-surface-400">บาท</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">คงเหลือติดลบ</p><p class="mt-2 text-3xl font-semibold">{{ negativeCount.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">รายการสินค้า</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">Lot ไม่ตรงกับยอดคงเหลือ</p><p class="mt-2 text-3xl font-semibold">{{ mismatchCount.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">ตามคำเตือนจาก Express</p></div>
    </div>

    <div class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <DataTable :value="filteredRows" :loading="loading" paginator :rows="25" :rows-per-page-options="[25, 50, 100]" sort-field="inventoryValue" :sort-order="-1" removable-sort striped-rows>
        <template #empty>{{ error || 'ยังไม่มีข้อมูล Stock Snapshot' }}</template>
        <Column field="productCode" header="รหัสสินค้า" sortable style="width: 16rem" />
        <Column field="productName" header="ชื่อสินค้า" sortable />
        <Column field="quantity" header="คงเหลือ" sortable style="width: 10rem"><template #body="p"><span :class="p.data.quantity < 0 ? 'font-semibold text-red-600' : ''">{{ quantity(p.data.quantity) }}</span></template></Column>
        <Column field="sourceUnitText" header="หน่วย" style="width: 8rem" />
        <Column field="unitCost" header="ต้นทุน/หน่วย" sortable style="width: 11rem"><template #body="p">{{ nullableMoney(p.data.unitCost) }}</template></Column>
        <Column field="inventoryValue" header="มูลค่าคงเหลือ" sortable style="width: 12rem"><template #body="p">{{ money(p.data.inventoryValue) }}</template></Column>
        <Column header="Lot" style="width: 9rem"><template #body="p"><Button :label="lotCount(p.data.sourceKey).toLocaleString('th-TH')" icon="pi pi-list" severity="secondary" text @click="openLots(p.data)" /></template></Column>
        <Column header="ตรวจสอบ" style="width: 9rem"><template #body="p"><Tag v-if="p.data.lotMismatch" value="Lot ไม่ตรง" severity="warn" /><span v-else>—</span></template></Column>
      </DataTable>
    </div>
    <Message v-if="error" severity="error" class="mt-4">{{ error }}</Message>
  </section>
</template>

<script>
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { fetchStockSnapshots } from '../../services/stock-data.js'
import StockImportView from './StockImportView.vue'

export default {
  name: 'StockListView',
  components: { Button, Column, DataTable, Dialog, InputText, Message, Select, StockImportView, Tag },
  data() { return { rows: [], lots: [], loading: true, error: '', importVisible: this.$route.query.import === '1', selectedSnapshotKey: null, searchTerm: '', lotDialogVisible: false, selectedProduct: null } },
  computed: {
    snapshotOptions() {
      const snapshots = new Map()
      this.rows.forEach((row) => {
        const value = this.snapshotId(row)
        if (!snapshots.has(value)) snapshots.set(value, { value, date: row.snapshotDate, label: `${this.date(row.snapshotDate)} · คลัง ${row.warehouseFrom} ถึง ${row.warehouseTo}` })
      })
      return [...snapshots.values()].sort((a, b) => b.date.localeCompare(a.date))
    },
    snapshotRows() { return this.rows.filter((row) => row.isActive !== false && this.snapshotId(row) === this.selectedSnapshotKey) },
    filteredRows() {
      const keyword = this.searchTerm.trim().toLocaleLowerCase('th-TH')
      if (!keyword) return this.snapshotRows
      return this.snapshotRows.filter((row) => String(row.productCode || '').toLocaleLowerCase('th-TH').includes(keyword) || String(row.productName || '').toLocaleLowerCase('th-TH').includes(keyword))
    },
    activeLots() { return this.lots.filter((lot) => lot.isActive !== false) },
    totalValue() { return this.filteredRows.reduce((total, row) => total + Number(row.inventoryValue || 0), 0) },
    negativeCount() { return this.filteredRows.filter((row) => row.quantity < 0).length },
    mismatchCount() { return this.filteredRows.filter((row) => row.lotMismatch).length },
    selectedLots() { return this.selectedProduct ? this.activeLots.filter((lot) => lot.snapshotKey === this.selectedProduct.sourceKey) : [] }
  },
  async mounted() { await this.loadRows() },
  methods: {
    async loadRows() {
      this.loading = true; this.error = ''
      try {
        const result = await fetchStockSnapshots()
        this.rows = result.rows; this.lots = result.lots
        if (!this.snapshotOptions.some((option) => option.value === this.selectedSnapshotKey)) this.selectedSnapshotKey = this.snapshotOptions[0]?.value || null
      } catch (error) { console.error(error); this.error = 'ไม่สามารถโหลด Stock Snapshot ได้' } finally { this.loading = false }
    },
    async handleImported() { this.importVisible = false; this.selectedSnapshotKey = null; await this.loadRows() },
    snapshotId(row) { return `${row.snapshotDate}|${row.warehouseFrom}|${row.warehouseTo}` },
    lotCount(snapshotKey) { return this.activeLots.filter((lot) => lot.snapshotKey === snapshotKey).length },
    openLots(product) { this.selectedProduct = product; this.lotDialogVisible = true },
    date(value) { return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) },
    money(value) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0) },
    nullableMoney(value) { return value == null ? '—' : this.money(value) },
    quantity(value) { return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 }).format(value || 0) }
  }
}
</script>

<style scoped></style>
