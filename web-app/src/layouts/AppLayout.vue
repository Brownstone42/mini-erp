<template>
  <div class="min-h-screen bg-surface-50 text-surface-900">
    <aside class="fixed inset-y-0 left-0 z-20 w-64 border-r border-surface-200 bg-white">
      <div class="flex h-16 items-center border-b border-surface-200 px-6">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">Internal</p>
          <h1 class="text-lg font-semibold">Mini ERP</h1>
        </div>
      </div>

      <nav class="space-y-3 p-4" aria-label="เมนูหลัก">
        <RouterLink
          to="/"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100"
          active-class="bg-primary-50 text-primary-700"
        >
          <i class="pi pi-home" />
          ภาพรวม
        </RouterLink>

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
          </div>
        </section>
      </nav>
    </aside>

    <div class="pl-64">
      <header class="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-surface-200 bg-white/95 px-8 backdrop-blur">
        <p class="text-sm text-surface-500">ระบบบริหารจัดการภายใน</p>
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
import { firebaseAuth } from '../services/firebase.js'

export default {
  name: 'AppLayout',
  components: {
    Avatar,
    Button
  },
  data() {
    const email = firebaseAuth.currentUser?.email || ''
    return {
      userEmail: email,
      userInitial: email.charAt(0).toUpperCase() || 'U',
      masterDataOpen: false,
      transactionDataOpen: false,
      reportsOpen: false,
      settingsOpen: false
    }
  },
  watch: {
    '$route.path'(path) {
      if (path.startsWith('/master-data/')) this.masterDataOpen = true
      if (path.startsWith('/sales/') || path.startsWith('/purchases/') || path.startsWith('/stock')) this.transactionDataOpen = true
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

<style scoped></style>
