<template>
  <section>
    <ConfirmDialog />
    <Button label="กลับไป Product Group" icon="pi pi-arrow-left" severity="secondary" text @click="$router.push({name:'product-group-list'})" />
    <div v-if="group" class="mt-4">
      <p class="text-sm font-medium text-primary-600">Settings · Product Group</p>
      <div class="mt-2 flex flex-wrap items-end gap-3"><label class="min-w-80 flex-1"><span class="mb-2 block text-sm font-medium">ชื่อ Group</span><InputText v-model="groupName" class="w-full" maxlength="100" /></label><Button label="บันทึกชื่อ" icon="pi pi-save" :loading="saving" :disabled="!canSave" @click="saveName" /></div>
      <Message v-if="message" :severity="messageSeverity" class="mt-4">{{ message }}</Message>
      <div class="mt-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
        <div class="mb-4"><h3 class="font-semibold">สินค้าใน Group</h3><p class="mt-1 text-sm text-surface-500">{{ group.items.length.toLocaleString('th-TH') }} รายการ · การเพิ่มสินค้าจะทำจากหน้าอื่นในขั้นต่อไป</p></div>
        <DataTable :value="group.items" :loading="loading" data-key="productCode" paginator :rows="25" :rows-per-page-options="[25,50,100]" striped-rows>
          <template #empty>ยังไม่มีสินค้าใน Group นี้</template>
          <Column field="productCode" header="รหัสสินค้า" sortable style="width: 16rem" />
          <Column field="productName" header="ชื่อสินค้า" sortable />
          <Column header="สถานะ" style="width: 9rem"><template #body="p"><Tag :value="p.data.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน'" :severity="p.data.isActive ? 'success' : 'secondary'" /></template></Column>
          <Column style="width: 8rem"><template #body="p"><Button label="ลบออก" icon="pi pi-trash" severity="danger" text @click="confirmRemove(p.data)" /></template></Column>
        </DataTable>
      </div>
    </div>
    <Message v-else-if="!loading" severity="error" class="mt-4">ไม่พบ Product Group</Message>
  </section>
</template>
<script>
import Button from 'primevue/button';import Column from 'primevue/column';import ConfirmDialog from 'primevue/confirmdialog';import DataTable from 'primevue/datatable';import InputText from 'primevue/inputtext';import Message from 'primevue/message';import Tag from 'primevue/tag'
import {fetchProductGroup,removeProductFromGroup,renameProductGroup} from '../../services/product-group-data.js'
export default{name:'ProductGroupDetailView',components:{Button,Column,ConfirmDialog,DataTable,InputText,Message,Tag},props:{id:{type:String,required:true}},data(){return{group:null,groupName:'',loading:true,saving:false,message:'',messageSeverity:'success'}},computed:{canSave(){return this.groupName.trim()&&this.groupName.trim()!==this.group?.groupName&&!this.saving}},async mounted(){await this.loadGroup()},methods:{async loadGroup(){this.loading=true;try{this.group=await fetchProductGroup(this.id);this.groupName=this.group?.groupName||''}catch(error){console.error(error)}finally{this.loading=false}},async saveName(){if(!this.canSave)return;this.saving=true;this.message='';try{await renameProductGroup(this.id,this.groupName);await this.loadGroup();this.message='บันทึกชื่อ Group แล้ว';this.messageSeverity='success'}catch(error){console.error(error);this.message='ไม่สามารถบันทึกชื่อ Group ได้ กรุณาตรวจสอบว่าชื่อไม่ซ้ำ';this.messageSeverity='error'}finally{this.saving=false}},confirmRemove(item){this.$confirm.require({header:'นำสินค้าออกจาก Group',message:`ต้องการนำ ${item.productCode} — ${item.productName} ออกจาก Group นี้หรือไม่`,icon:'pi pi-exclamation-triangle',rejectLabel:'ยกเลิก',acceptLabel:'ลบออก',accept:()=>{this.$confirm.close();void this.removeItem(item)}})},async removeItem(item){try{await removeProductFromGroup(this.id,item.productCode);await this.loadGroup();this.message='นำสินค้าออกจาก Group แล้ว';this.messageSeverity='success'}catch(error){console.error(error);this.message='ไม่สามารถนำสินค้าออกจาก Group ได้';this.messageSeverity='error'}}}}
</script><style scoped></style>
