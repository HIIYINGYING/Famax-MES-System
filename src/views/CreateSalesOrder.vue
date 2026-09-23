```vue
<template>
<div class="page">
<PageHeader title="Create New Order" subtitle="Enter order details, items, and customer drawing">
<template #actions><button class="secondary" @click="router.push({name:'sales-orders'})">← Back to Sales Order</button></template>
</PageHeader>

<form class="card form-grid" @submit.prevent="createOrder">

<div class="span-2">
<label>Customer</label>
<select v-model="form.customer_id" required @change="onCustomerSelected">
<option disabled value="">Select customer…</option>
<option v-for="c in customers" :key="c.id" :value="c.id">{{c.customer_code}} — {{c.customer_name}}</option>
</select>
</div>

<div v-if="selectedCustomer" class="span-2 autofill-box">
<b>Company Information <small>(auto-filled)</small></b>
<div class="autofill-grid">
<div><span>Location</span><strong>{{selectedCustomer.location||"-"}}</strong></div>
<div><span>Contact Number</span><strong>{{selectedCustomer.contact_number||"-"}}</strong></div>
<div><span>Contact Person</span><strong>{{selectedCustomer.contact_person_name||"-"}}</strong></div>
<div><span>Email</span><strong>{{selectedCustomer.email||"-"}}</strong></div>
</div>
</div>

<div><label>Order No</label><input v-model="form.order_no" placeholder="e.g. SO-2026-010" required></div>
<div><label>Order Date</label><input v-model="form.order_date" type="date" required></div>
<div><label>Required Date</label><input v-model="form.due_date" type="date"></div>
<div><label>Remarks</label><input v-model="form.remarks"></div>

<div class="span-2">
<h3>Order Items</h3>
<div v-for="(item,i) in form.items" :key="i" class="item-row">
<input v-model="item.part_number" placeholder="Part Number" required @blur="lookupPartHistory(item.part_number)">
<input v-model="item.part_name" placeholder="Part Name" required>
<input v-model.number="item.quantity" type="number" min="1" placeholder="Qty" required>
<button v-if="form.items.length>1" type="button" class="link danger" @click="form.items.splice(i,1)">Remove</button>
</div>
<button type="button" class="link" @click="addItem">+ Add Item</button>

<div v-if="partHistory.length" class="history">
<b>Previous orders for this part:</b>
<ul><li v-for="p in partHistory" :key="p.id">{{p.sales_orders?.order_no}} — Qty {{p.quantity}} ({{p.sales_orders?.order_date}})</li></ul>
</div>
</div>

<div class="span-2">
<h3>Customer Drawing</h3>

<div v-if="existingDrawing" class="document">
<div>📄 <strong>{{existingDrawing.file_name}}</strong></div>
<div class="actions">
<button type="button" class="doc-btn" @click="viewDrawing">View</button>
<label class="doc-btn replace">Replace<input hidden type="file" accept=".pdf,.png,.jpg,.jpeg,.dwg,.xlsx,.xls" @change="replaceDrawing"></label>
<button type="button" class="doc-btn remove" :disabled="documentSaving" @click="removeDrawing">{{documentSaving?"Removing...":"Remove"}}</button>
</div>
</div>

<div v-else class="upload">
<label class="upload-btn">📎 Upload Customer Drawing
<input hidden type="file" accept=".pdf,.png,.jpg,.jpeg,.dwg,.xlsx,.xls" @change="selectDrawing">
</label>
</div>

<div v-if="pendingDrawing" class="pending">
📎 {{pendingDrawing.name}}
<button type="button" class="link danger" @click="pendingDrawing=null">Cancel</button>
</div>

<p v-if="documentError" class="error">{{documentError}}</p>
</div>

<div class="span-2">
<button class="primary" type="submit" :disabled="saving">{{saving?"Saving…":"Save Order"}}</button>
</div>

<p v-if="formError" class="error span-2">{{formError}}</p>
<p v-if="successMsg" class="success span-2">{{successMsg}}</p>

</form>
</div>
</template>

<script setup>
import {ref,reactive,onMounted} from "vue";
import {useRouter} from "vue-router";
import {supabase} from "@/lib/supabase";
import PageHeader from "@/components/PageHeader.vue";

const router=useRouter(),customers=ref([]),selectedCustomer=ref(null),partHistory=ref([]);
const pendingDrawing=ref(null),existingDrawing=ref(null),saving=ref(false),documentSaving=ref(false);
const formError=ref(""),documentError=ref(""),successMsg=ref("");

const form=reactive({
 customer_id:"",order_no:"",order_date:new Date().toISOString().slice(0,10),
 due_date:"",remarks:"",items:[{part_number:"",part_name:"",quantity:1}]
});

async function loadCustomers(){
 const {data,error}=await supabase.from("customers").select("id,customer_code,customer_name,location,contact_number,contact_person_name,email").eq("status","ACTIVE");
 if(error) formError.value=error.message;
 customers.value=data||[];
}

function onCustomerSelected(){
 selectedCustomer.value=customers.value.find(c=>c.id===form.customer_id)||null;
}

function addItem(){
 form.items.push({part_number:"",part_name:"",quantity:1});
}

async function lookupPartHistory(partNumber){
 if(!partNumber?.trim()){partHistory.value=[];return;}
 const {data}=await supabase.from("sales_order_items").select("id,quantity,sales_orders(order_no,order_date)").eq("part_number",partNumber.trim()).limit(5);
 partHistory.value=data||[];
}

function selectDrawing(e){
 const file=e.target.files?.[0];
 if(file) pendingDrawing.value=file;
 e.target.value="";
}

function storagePath(url){
 if(!url)return null;
 const marker="/storage/v1/object/public/documents/";
 const i=url.indexOf(marker);
 return i<0?null:decodeURIComponent(url.substring(i+marker.length));
}

async function uploadDrawing(orderId,file){
 if(!file)return true;
 const name=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
 const path=`sales-orders/${orderId}/customer-drawing-${Date.now()}-${name}`;

 const {error:uErr}=await supabase.storage.from("documents").upload(path,file,{cacheControl:"3600",upsert:false});
 if(uErr){documentError.value=uErr.message;return false;}

 const {data:url}=supabase.storage.from("documents").getPublicUrl(path);
 const {data:{user}}=await supabase.auth.getUser();

 const {data, error}=await supabase.from("documents").insert({
  owner_type:"SALES_ORDER",owner_id:orderId,doc_type:"CUSTOMER_DRAWING",
  file_name:file.name,file_url:url.publicUrl,uploaded_by:user?.id||null
 }).select().single();

 if(error){
  await supabase.storage.from("documents").remove([path]);
  documentError.value=error.message;
  return false;
 }

 existingDrawing.value={...data,storage_path:path};
 return true;
}

async function removeDrawing(){
 if(!existingDrawing.value||!confirm("Remove this customer drawing?"))return;
 documentSaving.value=true;
 documentError.value="";
 const d=existingDrawing.value,path=d.storage_path||storagePath(d.file_url);

 if(path){
  const {error}=await supabase.storage.from("documents").remove([path]);
  if(error){documentError.value=error.message;documentSaving.value=false;return;}
 }

 const {error}=await supabase.from("documents").delete().eq("id",d.id);
 if(error) documentError.value=error.message;
 else existingDrawing.value=null;

 documentSaving.value=false;
}

async function replaceDrawing(e){
 const file=e.target.files?.[0];
 e.target.value="";
 if(!file)return;

 if(!existingDrawing.value){pendingDrawing.value=file;return;}

 documentSaving.value=true;
 documentError.value="";

 const old=existingDrawing.value,name=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
 const path=`sales-orders/${old.owner_id}/customer-drawing-${Date.now()}-${name}`;

 const {error:uErr}=await supabase.storage.from("documents").upload(path,file,{cacheControl:"3600",upsert:false});
 if(uErr){documentError.value=uErr.message;documentSaving.value=false;return;}

 const {data:url}=supabase.storage.from("documents").getPublicUrl(path);
 const {data:{user}}=await supabase.auth.getUser();

 const {data, error}=await supabase.from("documents").update({
  file_name:file.name,file_url:url.publicUrl,uploaded_by:user?.id||null,created_at:new Date().toISOString()
 }).eq("id",old.id).select().single();

 if(error){
  await supabase.storage.from("documents").remove([path]);
  documentError.value=error.message;
  documentSaving.value=false;
  return;
 }

 const oldPath=old.storage_path||storagePath(old.file_url);
 if(oldPath)await supabase.storage.from("documents").remove([oldPath]);

 existingDrawing.value={...data,storage_path:path};
 documentSaving.value=false;
}

function viewDrawing(){
 if(existingDrawing.value?.file_url)window.open(existingDrawing.value.file_url,"_blank");
}

async function createOrder(){
 saving.value=true;formError.value="";documentError.value="";successMsg.value="";

 const {data:order,error:orderErr}=await supabase.from("sales_orders").insert({
  customer_id:form.customer_id,order_no:form.order_no,order_date:form.order_date,
  due_date:form.due_date||null,remarks:form.remarks||null
 }).select().single();

 if(orderErr){formError.value=orderErr.message;saving.value=false;return;}

 const items=form.items.filter(i=>i.part_number&&i.part_name&&i.quantity>0).map(i=>({
  sales_order_id:order.id,part_number:i.part_number.trim(),part_name:i.part_name.trim(),quantity:i.quantity
 }));

 if(items.length){
  const {error}=await supabase.from("sales_order_items").insert(items);
  if(error){formError.value=error.message;saving.value=false;return;}
 }

 if(pendingDrawing.value){
  const ok=await uploadDrawing(order.id,pendingDrawing.value);
  if(!ok){formError.value="Order created, but customer drawing upload failed.";saving.value=false;return;}
 }

 saving.value=false;
 successMsg.value=`Order ${order.order_no} created successfully.`;
 setTimeout(()=>router.push({name:"sales-orders"}),900);
}

onMounted(loadCustomers);
</script>

<style scoped>
.page{padding:24px}.card{background:#fff;border:1px solid #e2e2e2;border-radius:6px;padding:20px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.span-2{grid-column:span 2}
label{display:block;font-size:12px;color:#666;margin-bottom:4px}
input,select{width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:13px}
h3{font-size:13px;margin:8px 0}
.item-row{display:grid;grid-template-columns:1fr 1fr 100px auto;gap:8px;margin-bottom:8px;align-items:center}
.link{background:none;border:0;color:#3f51b5;cursor:pointer;font-size:12px;padding:0}.danger{color:#c62828}
.primary{background:#3f51b5;color:#fff;border:0;padding:10px 20px;border-radius:4px;cursor:pointer;font-size:13px}
.primary:disabled,.remove:disabled{opacity:.6;cursor:not-allowed}
.secondary{background:#eee;color:#333;border:0;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:13px}
.error{color:#c62828;font-size:13px}.success{color:#2e7d32;font-size:13px;font-weight:600}
.autofill-box{background:#f5f6ff;border:1px solid #d5d9ff;border-radius:6px;padding:12px}
.autofill-box b{font-size:11px;color:#5c6bc0}.autofill-box small{color:#999;font-weight:400}
.autofill-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.autofill-grid span{display:block;font-size:10px;color:#999}.autofill-grid strong{display:block;font-size:13px;color:#333}
.history{margin-top:10px;background:#fafbfd;border:1px solid #eee;border-radius:6px;padding:8px 12px;font-size:11px;color:#555}
.history ul{margin:5px 0 0;padding-left:18px}
.document{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px;background:#f8f9fc;border:1px solid #ddd;border-radius:6px;font-size:12px}
.actions{display:flex;gap:6px}.doc-btn{border:0;background:#eee;color:#333;padding:7px 12px;border-radius:4px;font-size:11px;cursor:pointer}
.replace{background:#e8eaf6;color:#3f51b5}.remove{background:#ffebee;color:#c62828}
.upload{border:1px dashed #bbb;border-radius:6px;padding:18px;text-align:center;background:#fafafa}
.upload-btn{display:inline-block;background:#f0f0f5;color:#3f51b5;padding:9px 16px;border-radius:5px;font-size:12px;cursor:pointer;font-weight:600}
.pending{display:flex;justify-content:space-between;margin-top:8px;padding:8px;background:#f5f6ff;border:1px solid #d5d9ff;border-radius:5px;font-size:12px}
</style>
```
