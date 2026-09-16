import { defineStore } from 'pinia'

export const COMPANY_OPTIONS = Object.freeze([
  { id: 'idealglobe', name: 'Ideal Globe', shortName: 'Ideal Globe', database: 'minierp', ready: true },
  { id: 'goodbooch', name: 'Goodbooch', shortName: 'Goodbooch', database: 'goodboocherp', ready: false }
])

function initialCompanyId() {
  const saved = sessionStorage.getItem('mini-erp-company-mode')
  return COMPANY_OPTIONS.some((company) => company.id === saved) ? saved : 'idealglobe'
}

export const useCompanyStore = defineStore('company', {
  state: () => ({ activeCompanyId: initialCompanyId() }),
  getters: {
    activeCompany: (state) => COMPANY_OPTIONS.find((company) => company.id === state.activeCompanyId) || COMPANY_OPTIONS[0],
    isIdealGlobe: (state) => state.activeCompanyId === 'idealglobe'
  },
  actions: {
    switchCompany(companyId) {
      if (!COMPANY_OPTIONS.some((company) => company.id === companyId)) return
      this.activeCompanyId = companyId
      sessionStorage.setItem('mini-erp-company-mode', companyId)
    }
  }
})
