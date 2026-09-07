<template>
  <RouterView />
  <Toast position="top-right" />
  <ConfirmDialog />
</template>

<script>
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'

export default {
  name: 'App',
  components: {
    Toast,
    ConfirmDialog
  }
}
</script>

<style scoped>
</style>
