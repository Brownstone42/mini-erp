<template>
  <section>
    <div v-if="!pdfOnly" class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-primary-600">Sales</p>
        <h2 class="mt-1 text-3xl font-semibold tracking-tight">{{ isHistoryMode ? `ใบเสนอราคา ${quotationNumber}` : 'ออกใบเสนอราคา' }}</h2>
        <p class="mt-2 text-sm text-surface-500">ราคาต่อหน่วยและยอดรวมเป็นราคารวม VAT แล้ว</p>
      </div>
      <div class="flex gap-2">
        <Button label="ประวัติใบเสนอราคา" icon="pi pi-history" severity="secondary" outlined @click="$router.push({ name: 'quotation-list' })" />
        <Button v-if="issued" label="สร้างใบใหม่" icon="pi pi-plus" severity="secondary" outlined @click="goNewQuotation" />
        <Button v-if="issued" label="ดาวน์โหลด PDF อีกครั้ง" icon="pi pi-file-pdf" :loading="creatingPdf" @click="downloadPdf" />
      </div>
    </div>

    <template v-if="!pdfOnly">
      <Message v-if="loadError" severity="error" class="mt-5">{{ loadError }}</Message>
      <Message v-if="formError" severity="error" class="mt-5">{{ formError }}</Message>
      <Message v-if="issued" severity="success" class="mt-5">{{ isHistoryMode ? `โหลดใบเสนอราคา ${quotationNumber} จากประวัติแล้ว` : `ออกใบเสนอราคา ${quotationNumber} และบันทึกลงฐานข้อมูลแล้ว` }}</Message>
    </template>

    <fieldset v-if="!pdfOnly" :disabled="issued || Boolean(loadError)" class="mt-6 space-y-6 disabled:opacity-75">
      <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
        <div class="grid gap-4 lg:grid-cols-3">
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-surface-600">เลขที่ใบเสนอราคา</span>
            <InputText :model-value="quotationNumber || 'กำลังตรวจสอบเลขที่...'" readonly class="w-full bg-surface-50 font-semibold" />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-surface-600">วันที่</span>
            <DatePicker v-model="quotationDate" date-format="dd/mm/yy" show-icon class="w-full" />
          </label>
          <div class="rounded-lg bg-primary-50 p-4">
            <p class="text-xs text-primary-600">ยอดรวมสุทธิ (รวม VAT)</p>
            <p class="mt-1 text-2xl font-semibold text-primary-700">{{ money(totalAmount) }}</p>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
        <div class="mb-4">
          <h3 class="font-semibold">ข้อมูลลูกค้า</h3>
          <p class="mt-1 text-sm text-surface-500">ค้นหาจาก Customer Master หรือพิมพ์ชื่อลูกค้าใหม่ได้เลย</p>
        </div>
        <div class="grid gap-4 lg:grid-cols-2">
          <label class="block lg:col-span-2">
            <span class="mb-2 block text-sm font-medium text-surface-600">บริษัทลูกค้า *</span>
            <AutoComplete
              v-model="customerSelection"
              :suggestions="customerSuggestions"
              option-label="customerLabel"
              dropdown
              class="w-full"
              input-class="w-full"
              placeholder="พิมพ์ชื่อหรือรหัสลูกค้า"
              @complete="searchCustomers"
              @option-select="selectCustomer"
            />
          </label>
          <label class="block lg:col-span-2">
            <span class="mb-2 block text-sm font-medium text-surface-600">ที่อยู่</span>
            <Textarea v-model="customerAddress" rows="3" auto-resize class="w-full" />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-surface-600">Email</span>
            <InputText v-model="customerEmail" class="w-full" />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-surface-600">Tel</span>
            <InputText v-model="customerPhone" class="w-full" />
          </label>
        </div>
      </section>

      <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 class="font-semibold">รายการสินค้า</h3>
            <p class="mt-1 text-sm text-surface-500">เลือกสินค้าจาก Product Master แล้วแก้คำอธิบาย หน่วย และราคาได้</p>
          </div>
          <Button label="เพิ่มรายการ" icon="pi pi-plus" severity="secondary" outlined @click="addLine" />
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[980px] table-fixed border-separate border-spacing-y-2 text-sm">
            <thead class="text-left text-surface-500">
              <tr><th class="w-10">#</th><th class="w-64">รหัสสินค้า</th><th>ชื่อสินค้า *</th><th class="w-20">หน่วย</th><th class="w-24 text-right">จำนวน *</th><th class="w-28 text-right">ราคา/หน่วย *</th><th class="w-28 text-right">รวม</th><th class="w-12" /></tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in lines" :key="line.id" class="align-top">
                <td class="pt-3 text-surface-500">{{ index + 1 }}</td>
                <td class="pr-2">
                  <AutoComplete v-model="line.productSelection" :suggestions="productSuggestions" option-label="productLabel" dropdown force-selection class="w-full" input-class="w-full" placeholder="ค้นหารหัสหรือชื่อ" @complete="searchProducts" @option-select="selectProduct($event, line)">
                    <template #header>
                      <div class="border-b border-surface-200 bg-surface-50 p-3" @click.stop>
                        <label class="block">
                          <span class="mb-1.5 block text-xs font-semibold text-surface-500">กรองด้วย Product Group</span>
                          <select v-model="selectedProductGroupId" class="product-group-filter w-full" :disabled="loadingProductGroup" @mousedown.stop @click.stop @change.stop>
                            <option v-for="option in productGroupOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                          </select>
                        </label>
                      </div>
                    </template>
                  </AutoComplete>
                </td>
                <td class="pr-2"><Textarea v-model="line.description" rows="1" class="h-[42px] w-full resize-y" /></td>
                <td class="pr-2"><InputText v-model="line.unitText" class="w-full" /></td>
                <td class="pr-2"><InputNumber v-model="line.quantity" :min="0" :min-fraction-digits="0" :max-fraction-digits="4" input-class="w-full text-right" class="w-full" /></td>
                <td class="pr-2"><InputNumber v-model="line.unitPrice" mode="decimal" :min="0" :min-fraction-digits="2" :max-fraction-digits="4" input-class="w-full text-right" class="w-full" /></td>
                <td class="pt-3 text-right font-semibold">{{ money(lineTotal(line)) }}</td>
                <td><Button icon="pi pi-trash" severity="danger" text rounded aria-label="ลบรายการ" :disabled="lines.length === 1" @click="removeLine(index)" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
        <div class="grid gap-5 lg:grid-cols-2">
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-surface-600">หมายเหตุ</span>
            <InputText v-model="remarkText" class="w-full" />
          </label>
          <div>
            <div class="flex items-center gap-2">
              <Checkbox v-model="useSignatory" input-id="use-signatory" binary />
              <label for="use-signatory" class="cursor-pointer text-sm font-medium text-surface-600">ลงนามโดยกรรมการ</label>
            </div>
            <Select
              v-if="useSignatory"
              v-model="selectedSignatoryId"
              :options="signatoryOptions"
              option-label="label"
              option-value="value"
              placeholder="เลือกกรรมการลงนาม"
              class="mt-3 w-full"
              :disabled="!signatoryOptions.length"
            />
            <p v-if="useSignatory && !signatoryOptions.length" class="mt-2 text-xs text-red-600">ยังไม่มีกรรมการที่เปิดใช้งานและมีรูปลายเซ็น</p>
            <p v-else-if="useSignatory && selectedSignatory" class="mt-2 text-xs text-surface-500">{{ selectedSignatory.stampUrl ? 'มีลายเซ็นและตราประทับบริษัท' : 'มีลายเซ็น แต่ยังไม่มีตราประทับบริษัท' }}</p>
          </div>
        </div>
        <div class="mt-5 flex justify-end">
          <Button label="ออกใบเสนอราคาและดาวน์โหลด PDF" icon="pi pi-file-pdf" size="large" :loading="saving || creatingPdf" :disabled="!quotationNumber || saving || creatingPdf || Boolean(loadError)" @click="issueQuotation" />
        </div>
      </section>
    </fieldset>

    <div class="quotation-render-root" aria-hidden="true">
      <article v-for="(pageLines, pageIndex) in quotationPages" :key="pageIndex" ref="quotationPage" class="quotation-page">
        <header class="quote-header">
          <div class="company-brand">
            <img :src="logoUrl" alt="Ideal Globe" class="brand-logo" />
            <div>
              <div class="company-name">IDEAL GLOBE CO.,LTD.</div>
              <div class="company-contact">46 Prachauthit 27 Bangmod Thungkru BKK 10140</div>
              <div class="company-contact">Tel : 02-860-1525 &nbsp;&nbsp;&nbsp; Fax : 02-874-7557</div>
              <div class="company-contact">www.idealglobe.com</div>
            </div>
          </div>
          <div class="quote-heading"><strong>Quotation</strong><span>ใบเสนอราคา</span></div>
        </header>
        <div class="gold-rule" />

        <section class="quote-customer">
          <div class="customer-details">
            <p><span>Customer :</span><strong>{{ customerName }}</strong></p>
            <p><span>Address :</span><strong>{{ customerAddress || '-' }}</strong></p>
            <p><span>Email :</span><strong>{{ customerEmail || '-' }}</strong></p>
            <p><span>Tel :</span><strong>{{ customerPhone || '-' }}</strong></p>
          </div>
          <div class="quote-meta">
            <p><span>No. :</span><strong>{{ quotationNumber }}</strong></p>
            <p><span>Date :</span><strong>{{ displayLongDate(quotationDate) }}</strong></p>
          </div>
        </section>

        <p class="quote-intro">We are pleased to offer the following quotation for your consideration.</p>

        <section class="quote-table-wrap" :class="{ 'with-summary': pageIndex === quotationPages.length - 1 }">
          <img :src="logoUrl" alt="" class="watermark" />
          <table class="quote-table">
            <thead><tr><th>Item</th><th>Description</th><th>Quantity</th><th>Unit</th><th>Price</th><th>Total</th></tr></thead>
            <tbody>
              <tr v-for="line in pageLines" :key="line.id">
                <td>{{ lines.indexOf(line) + 1 }}</td>
                <td><strong v-if="line.productCode">{{ line.productCode }}</strong><br v-if="line.productCode" />{{ line.description }}</td>
                <td>{{ quantity(line.quantity) }}</td>
                <td>{{ line.unitText || '-' }}</td>
                <td>{{ moneyPlain(line.unitPrice) }}</td>
                <td>{{ moneyPlain(lineTotal(line)) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="pageIndex === quotationPages.length - 1" class="quote-summary">
            <div class="remarks"><strong>REMARKS</strong><p>- {{ remarkText }}</p></div>
            <div class="summary-total"><span>Grand Total<br /><small>(รวม VAT แล้ว)</small></span><strong>{{ moneyPlain(totalAmount) }}</strong></div>
            <div class="baht-text">({{ thaiTotal }})</div>
          </div>
        </section>

        <section v-if="pageIndex === quotationPages.length - 1" class="quote-closing">
          <div class="closing-message">
            <p>We hope that our quotation meets your requirements.</p>
          </div>
          <div class="approval-block">
            <img v-if="pdfStampUrl" :src="pdfStampUrl" alt="Company stamp" class="company-stamp" />
            <div class="signature">
              <div class="signature-space"><img v-if="pdfSignatureUrl" :src="pdfSignatureUrl" alt="Authorized signature" /></div>
              <div class="signature-line" />
              <strong>{{ selectedSignatory?.fullName || 'Anawat B. Buppajarn' }}</strong>
              <small>{{ selectedSignatory ? '(Authorized Director)' : '(Sales Manager)' }}</small>
              <span>{{ displayNumericDate(quotationDate) }}</span>
            </div>
          </div>
        </section>
        <div class="quote-footer">IDEAL GLOBE CO.,LTD.</div>
      </article>
    </div>
  </section>
</template>

<script>
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import DatePicker from 'primevue/datepicker'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import logoUrl from '../../assets/logo.png'
import { fetchCustomers } from '../../services/customer-data.js'
import { fetchProducts } from '../../services/product-data.js'
import { fetchProductGroup, fetchProductGroups } from '../../services/product-group-data.js'
import { createQuotation, fetchQuotation, previewNextQuotationNumber } from '../../services/quotation-data.js'
import { fetchSignatories } from '../../services/signatory-data.js'
import { quotationTotal, thaiBahtText } from '../../utils/quotation.js'

async function imageDataUrl(url) {
  if (!url) return ''
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Cannot load signatory image: ${response.status}`)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Cannot convert signatory image'))
    reader.readAsDataURL(blob)
  })
}

function copyComputedStyles(sourceRoot, clonedRoot) {
  const sourceNodes = [sourceRoot, ...sourceRoot.querySelectorAll('*')]
  const clonedNodes = [clonedRoot, ...clonedRoot.querySelectorAll('*')]
  sourceNodes.forEach((sourceNode, index) => {
    const clonedNode = clonedNodes[index]
    if (!clonedNode) return
    const computedStyle = window.getComputedStyle(sourceNode)
    for (const property of computedStyle) {
      clonedNode.style.setProperty(
        property,
        computedStyle.getPropertyValue(property),
        computedStyle.getPropertyPriority(property)
      )
    }
  })
}

export default {
  name: 'QuotationCreateView',
  components: { AutoComplete, Button, Checkbox, DatePicker, InputNumber, InputText, Message, Select, Textarea },
  props: { pdfOnly: { type: Boolean, default: false } },
  data() {
    return {
      logoUrl,
      customers: [], products: [], productGroups: [], signatories: [], customerSuggestions: [], productSuggestions: [],
      selectedProductGroupId: 'ALL', selectedProductGroupCodes: new Set(), productSearchQuery: '', loadingProductGroup: false,
      quotationDate: new Date(), quotationNumber: '', customerSelection: '', customerCode: '', customerName: '',
      customerAddress: '', customerEmail: '', customerPhone: '', remarkText: 'ยังไม่รวมค่าจัดส่ง',
      useSignatory: false, selectedSignatoryId: null,
      pdfSignatureUrl: '', pdfStampUrl: '',
      lines: [], loading: true, saving: false, creatingPdf: false, issued: false, loadError: '', formError: ''
    }
  },
  computed: {
    totalAmount() { return quotationTotal(this.lines) },
    signatoryOptions() { return this.signatories.filter((item) => item.isActive && item.signatureUrl).map((item) => ({ label: item.fullName, value: item.id })) },
    selectedSignatory() { return this.useSignatory ? this.signatories.find((item) => item.id === this.selectedSignatoryId) || null : null },
    isHistoryMode() { return Boolean(this.$route.params.quotationNumber) },
    productGroupOptions() { return [{ label: 'สินค้าทั้งหมด', value: 'ALL' }, ...this.productGroups.map((group) => ({ label: `${group.groupName} (${group.productCount.toLocaleString('th-TH')})`, value: group.id }))] },
    quotationDateIso() {
      const year = this.quotationDate.getFullYear()
      const month = String(this.quotationDate.getMonth() + 1).padStart(2, '0')
      const day = String(this.quotationDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    quotationPages() {
      const pages = []
      for (let index = 0; index < this.lines.length; index += 7) pages.push(this.lines.slice(index, index + 7))
      return pages.length ? pages : [[]]
    },
    thaiTotal() { return thaiBahtText(this.totalAmount) }
  },
  watch: {
    customerSelection(value) {
      if (typeof value === 'string') {
        this.customerCode = ''
        this.customerName = value
      }
    },
    quotationDate() { if (!this.issued) void this.refreshQuotationNumber() },
    selectedProductGroupId() { void this.loadSelectedProductGroup() }
    ,
    selectedSignatoryId() { this.pdfSignatureUrl = ''; this.pdfStampUrl = '' },
    useSignatory(value) { if (!value) { this.pdfSignatureUrl = ''; this.pdfStampUrl = '' } }
  },
  async mounted() {
    if (this.pdfOnly) return
    const savedQuotationNumber = String(this.$route.params.quotationNumber || '')
    if (!savedQuotationNumber) this.addLine()
    try {
      if (savedQuotationNumber) {
        this.signatories = await fetchSignatories()
        await this.loadSavedQuotation(savedQuotationNumber)
        if (this.$route.query.download === '1') {
          await this.$nextTick()
          await this.downloadPdf()
          await this.$router.replace({ name: 'quotation-detail', params: { quotationNumber: savedQuotationNumber } })
        }
      } else {
        ;[this.customers, this.products, this.productGroups, this.signatories] = await Promise.all([fetchCustomers(), fetchProducts(), fetchProductGroups(), fetchSignatories()])
        await this.refreshQuotationNumber()
      }
    } catch (error) {
      console.error(error)
      this.issued = false
      this.loadError = savedQuotationNumber
        ? error.message === 'QUOTATION_NOT_FOUND' ? 'ไม่พบใบเสนอราคานี้ในระบบ' : 'ไม่สามารถโหลดใบเสนอราคาจากประวัติได้ กรุณาตรวจสอบ Data Connect connector'
        : 'ยังไม่สามารถโหลดข้อมูลสำหรับใบเสนอราคาได้ กรุณาตรวจสอบว่าได้ Deploy Data Connect schema และ connector รุ่นล่าสุดแล้ว'
    } finally {
      this.loading = false
    }
  },
  beforeUnmount() {
    this.signatories.forEach((item) => {
      if (item.signatureUrl) URL.revokeObjectURL(item.signatureUrl)
      if (item.stampUrl) URL.revokeObjectURL(item.stampUrl)
    })
  },
  methods: {
    async downloadSavedQuotation(quotationNumber) {
      this.signatories = await fetchSignatories()
      await this.loadSavedQuotation(quotationNumber)
      return this.downloadPdf()
    },
    newLine() { return { id: crypto.randomUUID(), productSelection: null, productCode: '', description: '', unitText: '', quantity: 1, unitPrice: 0 } },
    addLine() { this.lines.push(this.newLine()) },
    removeLine(index) { if (this.lines.length > 1) this.lines.splice(index, 1) },
    lineTotal(line) { return (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0) },
    searchCustomers(event) {
      const keyword = event.query.trim().toLocaleLowerCase('th-TH')
      this.customerSuggestions = this.customers.filter((customer) => !keyword || [customer.customerCode, customer.customerName].some((value) => String(value || '').toLocaleLowerCase('th-TH').includes(keyword))).slice(0, 30).map((customer) => ({ ...customer, customerLabel: `${customer.customerCode} - ${customer.customerName}` }))
    },
    selectCustomer(event) {
      const customer = event.value
      this.customerCode = customer.customerCode
      this.customerName = customer.customerName
      this.customerAddress = customer.address || ''
      this.customerEmail = customer.email || ''
      this.customerPhone = customer.phone || ''
    },
    searchProducts(event) {
      this.productSearchQuery = event.query.trim().toLocaleLowerCase('th-TH')
      this.updateProductSuggestions()
    },
    updateProductSuggestions() {
      const keyword = this.productSearchQuery
      this.productSuggestions = this.products.filter((product) => product.isActive !== false && (this.selectedProductGroupId === 'ALL' || this.selectedProductGroupCodes.has(product.productCode)) && (!keyword || [product.productCode, product.productName].some((value) => String(value || '').toLocaleLowerCase('th-TH').includes(keyword)))).slice(0, 30).map((product) => ({ ...product, productLabel: `${product.productCode} - ${product.productName}` }))
    },
    async loadSelectedProductGroup() {
      const requestedGroupId = this.selectedProductGroupId
      this.selectedProductGroupCodes = new Set()
      if (requestedGroupId === 'ALL') { this.loadingProductGroup = false; this.updateProductSuggestions(); return }
      this.loadingProductGroup = true
      try {
        const group = await fetchProductGroup(requestedGroupId)
        if (this.selectedProductGroupId === requestedGroupId) {
          this.selectedProductGroupCodes = new Set((group?.items || []).map((item) => item.productCode))
          this.updateProductSuggestions()
        }
      } catch (error) {
        console.error(error)
        if (this.selectedProductGroupId === requestedGroupId) this.formError = 'ไม่สามารถโหลดรายการสินค้าใน Product Group ได้'
      } finally { if (this.selectedProductGroupId === requestedGroupId) this.loadingProductGroup = false }
    },
    selectProduct(event, line) {
      const product = event.value
      line.productCode = product.productCode
      line.description = product.productName
      line.unitText = product.salesUnit || product.smallUnit || ''
      if (product.standardPrice != null) line.unitPrice = Number(product.standardPrice)
    },
    async loadSavedQuotation(quotationNumber) {
      const quotation = await fetchQuotation(quotationNumber)
      if (!quotation) throw new Error('QUOTATION_NOT_FOUND')
      this.issued = true
      this.quotationNumber = quotation.quotationNumber
      const [year, month, day] = String(quotation.quotationDate).slice(0, 10).split('-').map(Number)
      this.quotationDate = new Date(year, month - 1, day)
      this.customerSelection = quotation.customerName
      this.customerCode = quotation.customerCode || ''
      this.customerName = quotation.customerName || ''
      this.customerAddress = quotation.addressText || ''
      this.customerEmail = quotation.email || ''
      this.customerPhone = quotation.phoneText || ''
      this.remarkText = quotation.remarkText || ''
      this.useSignatory = Boolean(quotation.signatoryId)
      this.selectedSignatoryId = quotation.signatoryId || null
      this.lines = (quotation.lines || []).map((line) => {
        return {
          id: crypto.randomUUID(),
          productSelection: line.productCode ? { productCode: line.productCode, productLabel: line.productCode } : null,
          productCode: line.productCode || '',
          description: line.description || '',
          unitText: line.unitText || '',
          quantity: Number(line.quantity) || 0,
          unitPrice: Number(line.unitPrice) || 0
        }
      })
      if (this.selectedSignatoryId) {
        if (!this.selectedSignatory) throw new Error('SAVED_SIGNATORY_NOT_FOUND')
        await this.prepareSignatoryImages()
      }
    },
    async refreshQuotationNumber() {
      this.quotationNumber = ''
      try { this.quotationNumber = await previewNextQuotationNumber(this.quotationDateIso) }
      catch (error) { console.error(error); this.loadError = 'ไม่สามารถอ่านเลขที่ใบเสนอราคาล่าสุดได้ กรุณา Deploy Data Connect schema และ connector ก่อนใช้งาน' }
    },
    validateForm() {
      if (!this.customerName.trim()) return 'กรุณาระบุบริษัทลูกค้า'
      if (this.useSignatory && !this.selectedSignatory) return 'กรุณาเลือกกรรมการที่มีรูปลายเซ็น'
      if (!this.lines.length) return 'กรุณาเพิ่มรายการสินค้า'
      const invalidIndex = this.lines.findIndex((line) => !line.productCode || !line.description.trim() || Number(line.quantity) <= 0 || Number(line.unitPrice) < 0)
      if (invalidIndex >= 0) return `กรุณาตรวจสอบรายการที่ ${invalidIndex + 1}: ต้องเลือกสินค้า ระบุรายละเอียด จำนวนมากกว่า 0 และราคาที่ถูกต้อง`
      return ''
    },
    async prepareSignatoryImages() {
      if (!this.selectedSignatory) { this.pdfSignatureUrl = ''; this.pdfStampUrl = ''; return }
      try {
        const [signatureUrl, stampUrl] = await Promise.all([
          imageDataUrl(this.selectedSignatory.signatureUrl),
          imageDataUrl(this.selectedSignatory.stampUrl)
        ])
        if (!signatureUrl) throw new Error('Selected signatory has no signature image')
        this.pdfSignatureUrl = signatureUrl
        this.pdfStampUrl = stampUrl
      } catch (error) {
        throw new Error('SIGNATORY_IMAGE_LOAD_FAILED', { cause: error })
      }
    },
    async issueQuotation() {
      if (this.saving || this.creatingPdf) return
      this.formError = this.validateForm()
      if (this.formError) return
      this.saving = true
      try {
        await this.prepareSignatoryImages()
        this.quotationNumber = await createQuotation({
          quotationDate: this.quotationDateIso, customerCode: this.customerCode, customerName: this.customerName,
          addressText: this.customerAddress, email: this.customerEmail, phoneText: this.customerPhone,
          signatoryId: this.selectedSignatory?.id || null,
          remarkText: this.remarkText, totalAmount: this.totalAmount, lines: this.lines
        })
        this.issued = true
        await this.downloadPdf()
      } catch (error) {
        console.error(error)
        this.formError = error.message === 'SIGNATORY_IMAGE_LOAD_FAILED'
          ? 'ไม่สามารถโหลดรูปลายเซ็นหรือตราประทับได้ ระบบยังไม่ได้บันทึกเอกสาร กรุณาลองใหม่อีกครั้ง'
          : 'ไม่สามารถออกใบเสนอราคาได้ ระบบยังไม่ได้บันทึกเอกสาร หรือเลขที่เอกสารอาจถูกใช้งานพร้อมกัน กรุณาลองอีกครั้ง'
      } finally { this.saving = false }
    },
    async downloadPdf() {
      if (this.creatingPdf) return
      this.creatingPdf = true
      try {
        if (this.selectedSignatory && !this.pdfSignatureUrl) await this.prepareSignatoryImages()
        await this.$nextTick()
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
        const pageElements = Array.isArray(this.$refs.quotationPage) ? this.$refs.quotationPage : [this.$refs.quotationPage]
        await Promise.all(pageElements.flatMap((page) => Array.from(page.querySelectorAll('img'))).map((image) => typeof image.decode === 'function' ? image.decode().catch(() => undefined) : Promise.resolve()))
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
        for (let index = 0; index < pageElements.length; index += 1) {
          const sourcePage = pageElements[index]
          const canvas = await html2canvas(sourcePage, {
            scale: 2,
            width: 794,
            height: 1123,
            windowWidth: 794,
            windowHeight: 1123,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false,
            onclone: (clonedDocument) => {
              const clonedPage = clonedDocument.querySelectorAll('.quotation-page')[index]
              if (clonedPage) copyComputedStyles(sourcePage, clonedPage)
            }
          })
          if (index > 0) pdf.addPage('a4', 'portrait')
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
        }
        pdf.save(`quotation-${this.quotationNumber}.pdf`)
        return true
      } catch (error) {
        console.error(error)
        this.formError = 'บันทึกใบเสนอราคาแล้ว แต่สร้างไฟล์ PDF ไม่สำเร็จ กรุณากดดาวน์โหลด PDF อีกครั้ง'
        return false
      } finally { this.creatingPdf = false }
    },
    resetForm() {
      this.issued = false; this.formError = ''; this.customerSelection = ''; this.customerCode = ''; this.customerName = ''
      this.customerAddress = ''; this.customerEmail = ''; this.customerPhone = ''; this.remarkText = 'ยังไม่รวมค่าจัดส่ง'
      this.useSignatory = false; this.selectedSignatoryId = null
      this.pdfSignatureUrl = ''; this.pdfStampUrl = ''
      this.quotationDate = new Date(); this.lines = [this.newLine()]; void this.refreshQuotationNumber()
    },
    goNewQuotation() { void this.$router.push({ name: 'quotation-create' }) },
    money(value) { return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2 }).format(Number(value) || 0) },
    moneyPlain(value) { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0) },
    quantity(value) { return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 }).format(Number(value) || 0) },
    displayLongDate(value) { return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }).format(value) },
    displayNumericDate(value) { return new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(value) }
  }
}
</script>

<style scoped>
.product-group-filter { height: 40px; border: 1px solid var(--p-inputtext-border-color); border-radius: var(--p-inputtext-border-radius); background: var(--p-inputtext-background); padding: 0 2.25rem 0 .75rem; color: var(--p-inputtext-color); outline: none; }
.product-group-filter:focus { border-color: var(--p-inputtext-focus-border-color); box-shadow: var(--p-inputtext-focus-ring-shadow); }
.quotation-render-root { position: fixed; left: -10000px; top: 0; z-index: -1; }
.quotation-page { position: relative; width: 794px; height: 1123px; overflow: hidden; background: #fff; color: #263143; font-family: "Noto Sans Thai", "Segoe UI", sans-serif; padding: 48px 58px 58px; }
.quote-header { display: flex; align-items: center; justify-content: space-between; min-height: 120px; }
.company-brand { display: flex; align-items: center; gap: 18px; }
.brand-logo { width: 122px; height: 88px; object-fit: contain; }
.company-name { color: #b79b61; font-size: 18px; font-weight: 700; letter-spacing: .2px; }
.company-contact { margin-top: 4px; font-size: 10px; color: #273246; }
.quote-heading { display: flex; flex-direction: column; align-items: center; line-height: 1; }
.quote-heading strong { font-size: 34px; }
.quote-heading span { margin-top: 5px; font-family: "Sukhumvit Set", Sukhumvit, "Leelawadee UI", sans-serif; font-size: 26px; font-weight: 600; }
.gold-rule { height: 4px; margin: 18px -58px 0; background: #d7bf8c; }
.quote-customer { display: grid; grid-template-columns: 1fr 210px; gap: 28px; margin-top: 42px; font-size: 12px; }
.quote-customer p { display: grid; grid-template-columns: 80px 1fr; margin: 0 0 8px; }
.quote-customer span { text-align: right; padding-right: 12px; font-weight: 400; }
.quote-customer strong { font-weight: 600; white-space: pre-wrap; }
.quote-meta p { grid-template-columns: 60px 1fr; }
.quote-intro { margin: 44px 0 14px; text-align: center; color: #b89b62; font-size: 13px; }
.quote-table-wrap { position: relative; min-height: 465px; overflow: hidden; border: 1px solid #c3a463; border-radius: 10px; }
.quote-table-wrap.with-summary { min-height: 520px; }
.watermark { position: absolute; z-index: 0; top: 60px; left: 150px; width: 390px; height: 310px; object-fit: contain; opacity: .055; }
.quote-table { position: relative; z-index: 1; width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
.quote-table th { height: 44px; border-bottom: 1px solid #c3a463; padding: 0 8px; text-align: center; font-weight: 700; }
.quote-table th:nth-child(1) { width: 48px; }
.quote-table th:nth-child(2) { width: 290px; }
.quote-table th:nth-child(3) { width: 72px; }
.quote-table th:nth-child(4) { width: 65px; }
.quote-table th:nth-child(5), .quote-table th:nth-child(6) { width: 90px; }
.quote-table td { height: 48px; padding: 8px; vertical-align: top; text-align: center; overflow-wrap: anywhere; }
.quote-table td:nth-child(2) { text-align: left; }
.quote-table td:nth-child(5), .quote-table td:nth-child(6) { text-align: center; }
.quote-summary { position: absolute; z-index: 2; right: 0; bottom: 0; left: 0; display: grid; grid-template-columns: 1fr 230px; min-height: 130px; border-top: 1px solid #c3a463; background: rgba(249, 246, 238, .93); }
.remarks { padding: 14px 18px; border-right: 1px solid rgba(195, 164, 99, .45); font-size: 11px; }
.remarks p { margin: 10px 0 0; text-align: left; }
.summary-total { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px; font-size: 14px; }
.summary-total small { color: #596273; font-size: 9px; font-weight: 400; }
.summary-total strong { font-size: 17px; }
.baht-text { position: absolute; right: 16px; bottom: 15px; max-width: 300px; font-size: 10px; text-align: right; }
.quote-closing { display: flex; justify-content: space-between; align-items: flex-start; padding: 26px 30px 0; font-size: 11px; }
.closing-message { display: flex; min-width: 0; flex: 1; flex-direction: column; align-items: flex-start; }
.closing-message p { margin-top: 10px; }
.approval-block { display: flex; align-items: flex-start; gap: 8px; }
.company-stamp { width: 110px; height: 72px; margin-top: -2px; object-fit: contain; }
.signature { display: flex; width: 205px; flex-direction: column; align-items: center; }
.signature-space { display: grid; width: 180px; height: 40px; place-items: center; }
.signature-space img { max-width: 155px; max-height: 44px; object-fit: contain; }
.signature-line { width: 180px; border-top: 1px dotted #b89b62; }
.signature small { margin-top: 2px; font-weight: 600; }
.signature span { margin-top: 18px; border-bottom: 1px dotted #b89b62; padding: 0 30px 4px; }
.quote-footer { position: absolute; right: 0; bottom: 0; left: 0; height: 34px; display: grid; place-items: center; background: #263143; color: #ead9b6; font-size: 11px; font-weight: 700; letter-spacing: .3px; }
</style>
