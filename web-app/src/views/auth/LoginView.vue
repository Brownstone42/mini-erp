<template>
  <main class="grid min-h-screen place-items-center bg-surface-100 px-4">
    <section class="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-8 shadow-xl shadow-surface-200/60">
      <div class="mb-8">
        <p class="text-sm font-semibold text-primary-600">Mini ERP</p>
        <h1 class="mt-2 text-2xl font-semibold">เข้าสู่ระบบ</h1>
        <p class="mt-2 text-sm text-surface-500">สำหรับผู้ใช้งานภายในบริษัทเท่านั้น</p>
      </div>

      <form class="space-y-5" @submit.prevent="submitLogin">
        <div>
          <label for="email" class="mb-2 block text-sm font-medium">Email</label>
          <InputText id="email" v-model.trim="email" type="email" class="w-full" autocomplete="email" required />
        </div>
        <div>
          <label for="password" class="mb-2 block text-sm font-medium">Password</label>
          <Password
            id="password" v-model="password" class="w-full" input-class="w-full" :feedback="false"
            toggle-mask autocomplete="current-password" required
          />
        </div>
        <Button type="submit" label="เข้าสู่ระบบ" icon="pi pi-sign-in" class="w-full" :loading="loading" />
      </form>

      <Message v-if="errorMessage" severity="error" class="mt-6">{{ errorMessage }}</Message>
    </section>
  </main>
</template>

<script>
import { signInWithEmailAndPassword } from 'firebase/auth'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
import { firebaseAuth } from '../../services/firebase.js'

export default {
  name: 'LoginView',
  components: { Button, InputText, Message, Password },
  data() {
    return { email: '', password: '', loading: false, errorMessage: '' }
  },
  methods: {
    async submitLogin() {
      this.loading = true
      this.errorMessage = ''
      try {
        await signInWithEmailAndPassword(firebaseAuth, this.email, this.password)
        const redirect = typeof this.$route.query.redirect === 'string' ? this.$route.query.redirect : '/'
        await this.$router.replace(redirect)
      } catch {
        this.errorMessage = 'Email หรือ Password ไม่ถูกต้อง'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped></style>
