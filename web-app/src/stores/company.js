import { defineStore } from 'pinia'
import { allowedCompanyIdsForEmail } from '../config/access-control.js'

export const COMPANY_OPTIONS = Object.freeze([
  { id: 'idealglobe', name: 'Ideal Globe', shortName: 'Ideal Globe', database: 'minierp', ready: true },
  { id: 'goodbooch', name: 'Goodbooch', shortName: 'Goodbooch', database: 'goodboocherp', ready: true }
])

function initialCompanyId() {
  const saved = sessionStorage.getItem('mini-erp-company-mode')
  return COMPANY_OPTIONS.some((company) => company.id === saved) ? saved : 'idealglobe'
}

export const useCompanyStore = defineStore('company', {
  state: () => ({ activeCompanyId: initialCompanyId(), allowedCompanyIds: ['idealglobe'] }),
  getters: {
    activeCompany: (state) => COMPANY_OPTIONS.find((company) => company.id === state.activeCompanyId) || COMPANY_OPTIONS[0],
    isIdealGlobe: (state) => state.activeCompanyId === 'idealglobe',
    companyOptions: (state) => COMPANY_OPTIONS.filter((company) => state.allowedCompanyIds.includes(company.id))
  },
  actions: {
    configureForUser(email) {
      this.allowedCompanyIds = allowedCompanyIdsForEmail(email)
      if (!this.allowedCompanyIds.includes(this.activeCompanyId)) {
        this.activeCompanyId = 'idealglobe'
        sessionStorage.setItem('mini-erp-company-mode', 'idealglobe')
      }
    },
    canAccess(companyId) {
      return this.allowedCompanyIds.includes(companyId)
    },
    switchCompany(companyId) {
      if (!COMPANY_OPTIONS.some((company) => company.id === companyId) || !this.canAccess(companyId)) return
      this.activeCompanyId = companyId
      sessionStorage.setItem('mini-erp-company-mode', companyId)
    }
  }
})
