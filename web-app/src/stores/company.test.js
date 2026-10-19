import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCompanyStore } from './company.js'
import { allowedModuleIdsForEmail, canAccessModule } from '../config/access-control.js'

describe('company mode store', () => {
  beforeEach(() => {
    sessionStorage.clear()
    setActivePinia(createPinia())
  })

  it('starts in Ideal Globe mode', () => {
    const store = useCompanyStore()
    expect(store.activeCompanyId).toBe('idealglobe')
    expect(store.isIdealGlobe).toBe(true)
  })

  it('switches to Goodbooch and remembers it for the browser session', () => {
    const store = useCompanyStore()
    store.configureForUser('anawatbooch@gmail.com')
    store.switchCompany('goodbooch')
    expect(store.activeCompany.database).toBe('goodboocherp')
    expect(store.isIdealGlobe).toBe(false)
    expect(sessionStorage.getItem('mini-erp-company-mode')).toBe('goodbooch')
  })

  it('keeps an Ideal Globe-only user out of Goodbooch', () => {
    const store = useCompanyStore()
    store.configureForUser('wareemon@idealglobe.com')
    store.switchCompany('goodbooch')
    expect(store.activeCompanyId).toBe('idealglobe')
    expect(store.companyOptions.map((company) => company.id)).toEqual(['idealglobe'])
  })

  it('limits the accounting user to Master Data and Transaction Data', () => {
    expect(allowedModuleIdsForEmail('idealglobe.account@gmail.com')).toEqual(['dashboard', 'master-data', 'transaction-data'])
    expect(canAccessModule('idealglobe.account@gmail.com', 'master-data')).toBe(true)
    expect(canAccessModule('idealglobe.account@gmail.com', 'transaction-data')).toBe(true)
    expect(canAccessModule('idealglobe.account@gmail.com', 'reports')).toBe(false)
    expect(canAccessModule('idealglobe.account@gmail.com', 'settings')).toBe(false)
  })
})
