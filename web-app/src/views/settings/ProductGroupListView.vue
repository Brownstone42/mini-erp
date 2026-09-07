<template>
  <section>
    <Dialog v-model:visible="createDialogVisible" modal header="สร้าง Product Group" class="w-full max-w-md">
      <label class="block"><span class="mb-2 block text-sm font-medium">ชื่อ Group</span><InputText v-model="newGroupName" class="w-full" maxlength="100" autofocus @keyup.enter="createGroup" /></label>
      <Message v-if="formError" severity="error" class="mt-4">{{ formError }}</Message>
      <template #footer><Button label="ยกเลิก" severity="secondary" text @click="createDialogVisible = false" /><Button label="สร้าง Group" icon="pi pi-plus" :loading="saving" :disabled="!newGroupName.trim() || saving" @click="createGroup" /></template>
    </Dialog>

    <div class="flex items-start justify-between gap-6">
      <div><p class="text-sm font-medium text-primary-600">Settings</p><h2 class="mt-1 text-3xl font-semibold tracking-tight">Product Group</h2><p class="mt-2 text-sm text-surface-500">จัดกลุ่มสินค้าภายในระบบ โดย Product หนึ่งรายการสามารถอยู่ได้หลาย Group</p></div>
      <Button label="สร้าง Product Group" icon="pi pi-plus" @click="openCreateDialog" />
    </div>

    <div class="mt-6 grid gap-4 sm:grid-cols-2">
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">Product Group ทั้งหมด</p><p class="mt-2 text-3xl font-semibold">{{ groups.length.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">กลุ่ม</p></div>
      <div class="rounded-xl border border-surface-200 bg-white p-5"><p class="text-sm text-surface-500">สินค้าในทุก Group</p><p class="mt-2 text-3xl font-semibold">{{ totalMemberships.toLocaleString('th-TH') }}</p><p class="mt-1 text-xs text-surface-400">รายการสมาชิก</p></div>
    </div>

    <div class="mt-6 rounded-xl border border-surface-200 bg-white shadow-sm">
      <DataTable :value="groups" :loading="loading" data-key="id" striped-rows @row-click="openGroup">
        <template #empty><div class="py-10 text-center text-surface-500">{{ loadError || 'ยังไม่มี Product Group' }}</div></template>
        <Column field="groupName" header="ชื่อ Group" sortable />
        <Column field="productCount" header="จำนวนสินค้า" sortable style="width: 12rem"><template #body="p">{{ p.data.productCount.toLocaleString('th-TH') }}</template></Column>
        <Column header="อัปเดตล่าสุด" style="width: 16rem"><template #body="p">{{ dateTime(p.data.updatedAt) }}</template></Column>
      </DataTable>
    </div>
  </section>
</template>
<script>
import Button from 'primevue/button'; import Column from 'primevue/column'; import DataTable from 'primevue/datatable'; import Dialog from 'primevue/dialog'; import InputText from 'primevue/inputtext'; import Message from 'primevue/message'
import { createProductGroup, fetchProductGroups } from '../../services/product-group-data.js'
export default { name:'ProductGroupListView',components:{Button,Column,DataTable,Dialog,InputText,Message},data(){return{groups:[],loading:true,loadError:'',createDialogVisible:false,newGroupName:'',formError:'',saving:false}},computed:{totalMemberships(){return this.groups.reduce((total,group)=>total+group.productCount,0)}},async mounted(){await this.loadGroups()},methods:{async loadGroups(){this.loading=true;try{this.groups=await fetchProductGroups()}catch(error){console.error(error);this.loadError='ไม่สามารถโหลด Product Group ได้'}finally{this.loading=false}},openCreateDialog(){this.newGroupName='';this.formError='';this.createDialogVisible=true},async createGroup(){if(!this.newGroupName.trim()||this.saving)return;this.saving=true;this.formError='';try{await createProductGroup(this.newGroupName);this.createDialogVisible=false;await this.loadGroups()}catch(error){console.error(error);this.formError='ไม่สามารถสร้าง Group ได้ กรุณาตรวจสอบว่าชื่อไม่ซ้ำ'}finally{this.saving=false}},openGroup(event){this.$router.push({name:'product-group-detail',params:{id:event.data.id}})},dateTime(value){return new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}}}
</script>
<style scoped>:deep(.p-datatable-tbody > tr){cursor:pointer}</style>
