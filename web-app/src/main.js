import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'

import App from './App.vue'
import router from './router'
import { pinia } from './stores/pinia.js'
import './styles/main.css'
import 'primeicons/primeicons.css'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.app-dark',
      cssLayer: {
        name: 'primevue',
        order: 'theme, base, primevue'
      }
    }
  },
  ripple: true
})
app.use(ToastService)
app.use(ConfirmationService)

app.mount('#app')
