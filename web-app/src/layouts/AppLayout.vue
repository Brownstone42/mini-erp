<template>
  <div class="min-h-screen bg-surface-50 text-surface-900">
    <aside class="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-surface-200 bg-white">
      <div class="shrink-0 border-b border-surface-200 p-4">
        <div class="px-2">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">Internal</p>
          <h1 class="text-lg font-semibold">{{ activeCompany.shortName }} ERP</h1>
        </div>
        <label class="mt-3 block">
          <span class="mb-1.5 block px-2 text-[11px] font-semibold uppercase tracking-wide text-surface-400">สลับบริษัท</span>
          <Select v-model="activeCompanyId" :options="companyOptions" option-label="name" option-value="id" class="w-full" size="small" />
        </label>
      </div>

      <nav class="sidebar-nav min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-label="เมนูหลัก">
        <RouterLink
          :to="homeRoute"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100"
          active-class="bg-primary-50 text-primary-700"
        >
          <i class="pi pi-home" />
          ภาพรวม
        </RouterLink>

        <template v-if="companyStore.isIdealGlobe">
          <section>
            <button type="button" class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-100" :aria-expanded="salesOpen" @click="salesOpen = !salesOpen">
              <span class="flex items-center gap-3"><i class="pi pi-file-edit" /> Sales</span>
              <i class="pi text-xs" :class="salesOpen ? 'pi-chevron-up' : 'pi-chevron-down'" />
            </button>
            <div v-show="salesOpen" class="mt-1 border-l border-surface-200 pl-3">
              <RouterLink to="/sales/quotations/new" class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100" active-class="bg-primary-50 text-primary-700"><i class="pi pi-file-pdf" /> Quotation</RouterLink>
            </div>
          </section>

          <section>
            <button type="button" class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-100" :aria-expanded="masterDataOpen" @click="masterDataOpen = !masterDataOpen">
              <span class="flex items-center gap-3"><i class="pi pi-database" /> Master Data</span>
              <i class="pi text-xs" :class="masterDataOpen ? 'pi-chevron-up' : 'pi-chevron-down'" />
            </button>
            <div v-show="masterDataOpen" class="mt-1 border-l border-surface-200 pl-3">
              <RouterLink to="/master-data/suppliers" class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100" active-class="bg-primary-50 text-primary-700"><i class="pi pi-building" /> Supplier</RouterLink>
              <RouterLink to="/master-data/customers" class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100" active-class="bg-primary-50 text-primary-700"><i class="pi pi-users" /> Customer</RouterLink>
              <RouterLink to="/master-data/products" class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100" active-class="bg-primary-50 text-primary-700"><i class="pi pi-box" /> Product</RouterLink>
              <RouterLink to="/master-data/product-categories" class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100" active-class="bg-primary-50 text-primary-700"><i class="pi pi-tags" /> Product Category</RouterLink>
            </div>
          </section>

          <section>
            <button type="button" class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-100" :aria-expanded="reportsOpen" @click="reportsOpen = !reportsOpen">
              <span class="flex items-center gap-3"><i class="pi pi-chart-bar" /> Reports</span>
              <i class="pi text-xs" :class="reportsOpen ? 'pi-chevron-up' : 'pi-chevron-down'" />
            </button>
            <div v-show="reportsOpen" class="mt-1 border-l border-surface-200 pl-3">
              <RouterLink to="/reports/sales" class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100" active-class="bg-primary-50 text-primary-700"><i class="pi pi-chart-line" /> Sales Report</RouterLink>
              <RouterLink to="/reports/customer-sales" class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100" active-class="bg-primary-50 text-primary-700"><i class="pi pi-users" /> Customer Sales</RouterLink>
              <RouterLink to="/reports/product-purchase-cost" class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100" active-class="bg-primary-50 text-primary-700"><i class="pi pi-receipt" /> Product Purchase Cost</RouterLink>
              <RouterLink to="/reports/product-sales-price" class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100" active-class="bg-primary-50 text-primary-700"><i class="pi pi-tags" /> Product Sales Price</RouterLink>
            </div>
          </section>

          <section>
            <button type="button" class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-100" :aria-expanded="transactionDataOpen" @click="transactionDataOpen = !transactionDataOpen">
              <span class="flex items-center gap-3"><i class="pi pi-arrow-right-arrow-left" /> Transaction Data</span>
              <i class="pi text-xs" :class="transactionDataOpen ? 'pi-chevron-up' : 'pi-chevron-down'" />
            </button>
            <div v-show="transactionDataOpen" class="mt-1 border-l border-surface-200 pl-3">
              <RouterLink to="/sales/history" class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100" active-class="bg-primary-50 text-primary-700"><i class="pi pi-chart-line" /> Sales History</RouterLink>
              <RouterLink to="/purchases/history" class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100" active-class="bg-primary-50 text-primary-700"><i class="pi pi-shopping-cart" /> Purchase History</RouterLink>
              <RouterLink to="/stock" class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100" active-class="bg-primary-50 text-primary-700"><i class="pi pi-box" /> Stock</RouterLink>
            </div>
          </section>

          <section>
            <button type="button" class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-100" :aria-expanded="settingsOpen" @click="settingsOpen = !settingsOpen">
              <span class="flex items-center gap-3"><i class="pi pi-cog" /> Settings</span>
              <i class="pi text-xs" :class="settingsOpen ? 'pi-chevron-up' : 'pi-chevron-down'" />
            </button>
            <div v-show="settingsOpen" class="mt-1 border-l border-surface-200 pl-3">
              <RouterLink to="/settings/product-groups" class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100" active-class="bg-primary-50 text-primary-700"><i class="pi pi-bookmark" /> Product Group</RouterLink>
              <RouterLink to="/settings/signatories" class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100" active-class="bg-primary-50 text-primary-700"><i class="pi pi-id-card" /> กรรมการลงนาม</RouterLink>
            </div>
          </section>
        </template>

        <div v-else class="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
          โหมด Goodbooch ถูกแยกออกจากข้อมูล Ideal Globe แล้ว เมนูจะเปิดเพิ่มหลังเชื่อมฐานข้อมูลใหม่
        </div>
      </nav>
    </aside>

    <div class="pl-64">
      <header class="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-surface-200 bg-white/95 px-8 backdrop-blur">
        <p class="text-sm text-surface-500">ระบบบริหารจัดการภายใน · {{ activeCompany.name }}</p>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <p class="text-sm font-medium">ผู้ใช้งาน</p>
            <p class="text-xs text-surface-500">{{ userEmail }}</p>
          </div>
          <Avatar :label="userInitial" shape="circle" />
          <Button icon="pi pi-sign-out" severity="secondary" text aria-label="ออกจากระบบ" @click="logout" />
        </div>
      </header>

      <main class="p-8">
        <RouterView v-slot="{ Component, route }">
          <KeepAlive>
            <component :is="Component" v-if="route.meta.keepAlive" :key="route.name" />
          </KeepAlive>
          <component :is="Component" v-if="!route.meta.keepAlive" :key="route.fullPath" />
        </RouterView>
      </main>
    </div>
  </div>
</template>

<script>
import Avatar from 'primevue/avatar'
import { signOut } from 'firebase/auth'
import Button from 'primevue/button'
import Select from 'primevue/select'
import { firebaseAuth } from '../services/firebase.js'
import { COMPANY_OPTIONS, useCompanyStore } from '../stores/company.js'

export default {
  name: 'AppLayout',
  components: {
    Avatar,
    Button,
    Select
  },
  data() {
    const email = firebaseAuth.currentUser?.email || ''
    return {
      companyStore: useCompanyStore(),
      userEmail: email,
      userInitial: email.charAt(0).toUpperCase() || 'U',
      salesOpen: false,
      masterDataOpen: false,
      transactionDataOpen: false,
      reportsOpen: false,
      settingsOpen: false
    }
  },
  computed: {
    activeCompany() { return this.companyStore.activeCompany },
    companyOptions() { return COMPANY_OPTIONS },
    homeRoute() { return this.companyStore.isIdealGlobe ? { name: 'dashboard' } : { name: 'company-workspace' } },
    activeCompanyId: {
      get() { return this.companyStore.activeCompanyId },
      set(value) {
        this.companyStore.switchCompany(value)
        this.salesOpen = false; this.masterDataOpen = false; this.transactionDataOpen = false; this.reportsOpen = false; this.settingsOpen = false
        void this.$router.push(this.companyStore.isIdealGlobe ? { name: 'dashboard' } : { name: 'company-workspace' })
      }
    }
  },
  watch: {
    '$route.path'(path) {
      if (path.startsWith('/sales/quotations')) this.salesOpen = true
      if (path.startsWith('/master-data/')) this.masterDataOpen = true
      if ((path.startsWith('/sales/') && !path.startsWith('/sales/quotations')) || path.startsWith('/purchases/') || path.startsWith('/stock')) this.transactionDataOpen = true
      if (path.startsWith('/reports/')) this.reportsOpen = true
      if (path.startsWith('/settings/')) this.settingsOpen = true
    }
  },
  methods: {
    async logout() {
      await signOut(firebaseAuth)
      await this.$router.replace({ name: 'login' })
    }
  }
}
</script>

<style scoped>
.sidebar-nav {
  scrollbar-width: thin;
  scrollbar-color: var(--p-surface-300) transparent;
}

.sidebar-nav::-webkit-scrollbar { width: 6px; }
.sidebar-nav::-webkit-scrollbar-track { background: transparent; }
.sidebar-nav::-webkit-scrollbar-thumb { background: var(--p-surface-300); border-radius: 999px; }
.sidebar-nav::-webkit-scrollbar-thumb:hover { background: var(--p-surface-400); }
</style>
