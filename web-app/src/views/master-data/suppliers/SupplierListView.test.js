import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../services/supplier-data.js', () => ({
  fetchSuppliers: vi.fn().mockResolvedValue([
    { supplierCode: 'AP001', supplierName: 'One', status: 'ACTIVE' },
    { supplierCode: 'AP002', supplierName: 'Two', status: 'ACTIVE' },
    { supplierCode: 'AP003', supplierName: 'Three', status: 'INACTIVE' }
  ])
}))

import SupplierListView from './SupplierListView.vue'

describe('SupplierListView', () => {
  it('shows active suppliers by default', async () => {
    const wrapper = mount(SupplierListView, {
      global: {
        plugins: [createPinia(), PrimeVue],
        mocks: {
          $router: { push: () => {} }
        },
        stubs: {
          DataTable: {
            props: ['value'],
            template: '<div data-test="row-count">{{ value.length }}</div>'
          },
          Column: true,
          Button: true,
          IconField: { template: '<div><slot /></div>' },
          InputIcon: true,
          InputText: true,
          SelectButton: true,
          Tag: true
        }
      }
    })

    await flushPromises()

    expect(wrapper.get('[data-test="row-count"]').text()).toBe('2')
  })
})
