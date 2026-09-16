import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCompanyStore } from './company.js'

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
    store.switchCompany('goodbooch')
    expect(store.activeCompany.database).toBe('goodboocherp')
    expect(store.isIdealGlobe).toBe(false)
    expect(sessionStorage.getItem('mini-erp-company-mode')).toBe('goodbooch')
  })
})
