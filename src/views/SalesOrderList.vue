```vue
<template>
<div class="page">
<PageHeader title="Sales Order" subtitle="Create and manage customer orders">
<template #actions>
<button class="primary" @click="router.push({name:'create-order'})">+ Create New Order</button>
</template>
</PageHeader>

<div class="card">
<div v-if="loading" class="loading">Loading orders…</div>
<div v-else-if="error" class="error">{{error}}</div>

<table v-else>
<thead>
<tr><th>Order No</th><th>Customer</th><th>Order Date</th><th>Due Date</th><th>Status</th><th></th></tr>
</thead>
<tbody>
<tr v-for="o in orders" :key="o.id" :class="{rejected:o.status==='REJECTED'}">
<td><strong>{{o.order_no}}</strong></td>
<td>{{o.customers?.customer_name||"-"}}</td>
<td>{{o.order_date}}</td>
<td>{{o.due_date||"-"}}</td>
<td><span class="pill" :class="statusClass(o.status)">{{o.status}}</span></td>
<td><button class="view-btn" @click="openDetail(o)">View</button></td>
</tr>
<tr v-if="!orders.length"><td colspan="6" class="empty">No sales orders yet.</td></tr>
</tbody>
</table>
</div>

<!-- DETAIL MODAL -->
<div v-if="detail" class="modal-backdrop" @click.self="closeDetail">
<div class="modal">

<header class="modal-header">
<div>
<div class="order-title">{{detail.order_no}}</div>
<div class="order-subtitle">{{detail.customers?.customer_name||"-"}}</div>
</div>
<div class="header-right">
<span class="pill" :class="statusClass(detail.status)">{{detail.status}}</span>
<button class="icon-btn" @click="closeDetail">✕</button>
</div>
</header>

<!-- REJECTION -->
<div v-if="detail.status==='REJECTED'" class="banner reject">
<div class="banner-title">⚠ Order Rejected by Engineering</div>
<div>{{detail.rejection_reason||"No reason provided."}}</div>
</div>

<div v-else-if="detail.reviewed_by&&detail.status!=='CREATED'" class="banner approve">
✓ Approved by Engineering — moved to Development
<span>{{detail.reviewed_at?new Date(detail.reviewed_at).toLocaleDateString():""}}</span>
</div>

<!-- ORDER INFORMATION -->
<section class="section">
<div class="section-head">
<h3>Order Information</h3>
</div>

<div class="info-grid">
<div class="info-card">
<span>Customer</span>
<strong>{{detail.customers?.customer_name||"-"}}</strong>
</div>

<div class="info-card">
<span>Order Date</span>
<strong>{{detail.order_date||"-"}}</strong>
</div>

<div class="info-card">
<span>Required Date</span>
<strong>{{detail.due_date||"-"}}</strong>
</div>

<div class="info-card">
<span>Remarks</span>
<strong>{{detail.remarks||"-"}}</strong>
</div>
</div>
</section>

<!-- ORDER ITEMS -->
<section class="section">
<div class="section-head">
<h3>Order Items</h3>
<button
v-if="detail.status==='REJECTED'&&!editingItems"
class="outline-btn"
@click="startEditItems"
>✎ Correct Mistake</button>
</div>

<table v-if="!editingItems" class="inner-table">
<thead>
<tr><th>Part Number</th><th>Part Name</th><th>Quantity</th><th>Remarks</th></tr>
</thead>
<tbody>
<tr v-for="item in items" :key="item.id">
<td><strong>{{item.part_number}}</strong></td>
<td>{{item.part_name}}</td>
<td>{{item.quantity}}</td>
<td>{{item.remarks||"-"}}</td>
</tr>
<tr v-if="!items.length"><td colspan="4" class="empty">No line items.</td></tr>
</tbody>
</table>

<div v-else class="edit-box">
<div v-for="(item,i) in editItems" :key="i" class="edit-row">
<input v-model="item.part_number" placeholder="Part Number">
<input v-model="item.part_name" placeholder="Part Name">
<input v-model.number="item.quantity" type="number" min="1" placeholder="Qty">
<input v-model="item.remarks" placeholder="Remarks">
<button type="button" class="remove-btn" @click="editItems.splice(i,1)">Remove</button>
</div>

<button type="button" class="link" @click="editItems.push({part_number:'',part_name:'',quantity:1,remarks:''})">
+ Add Item
</button>

<div class="edit-actions">
<button class="secondary" @click="editingItems=false">Cancel</button>
<button class="primary" @click="saveItemCorrections" :disabled="saving">
{{saving?"Saving…":"Save Corrections"}}
</button>
</div>
</div>
</section>

<!-- CUSTOMER DRAWING -->
<section class="section">
<div class="section-head">
<div>
<h3>Customer Drawing</h3>
<p class="section-desc">Drawing submitted by Business Development</p>
</div>

<label class="upload-btn">
{{uploading?"Uploading…":"+ Upload Drawing"}}
<input
type="file"
hidden
:disabled="!!uploading"
accept=".pdf,.png,.jpg,.jpeg,.dwg,.xlsx,.xls"
@change="handleUpload"
/>
</label>
</div>

<div v-if="docsFor('CUSTOMER_DRAWING').length" class="drawing-list">
<div
v-for="d in docsFor('CUSTOMER_DRAWING')"
:key="d.id"
class="drawing-card"
>
<div class="drawing-info">
<div class="drawing-icon">📐</div>
<div>
<a :href="d.file_url" target="_blank" class="drawing-name">
{{d.file_name}}
</a>
<div class="drawing-date">
Uploaded {{formatDate(d.created_at||d.uploaded_at)}}
</div>
</div>
</div>

<div class="drawing-actions">
<a :href="d.file_url" target="_blank" class="small-btn">View</a>

<button
class="small-btn danger-btn"
:disabled="deletingDoc===d.id"
@click="removeDrawing(d)"
>
{{deletingDoc===d.id?"Removing…":"Remove"}}
</button>
</div>
</div>
</div>

<div v-else class="empty-document">
<div class="empty-icon">📐</div>
<strong>No customer drawing uploaded</strong>
<span>Upload the customer's drawing for Engineering verification.</span>
</div>

<p v-if="formError" class="error">{{formError}}</p>
</section>

<!-- FOOTER ACTION -->
<footer class="modal-footer">
<button
v-if="canSendToEng"
class="primary send-btn"
@click="sendToEng"
:disabled="saving||editingItems"
>
{{saving?"Sending…":detail.status==='REJECTED'?"↻ Resend to Engineering":"Send to Engineering for Verification →"}}
</button>
</footer>

</div>
</div>
</div>
</template>

<script setup>
import {ref,computed,onMounted} from "vue";
import {useRouter} from "vue-router";
import {supabase} from "@/lib/supabase";
import PageHeader from "@/components/PageHeader.vue";

const router=useRouter();

const orders=ref([]);
const loading=ref(true);
const error=ref(null);

const detail=ref(null);
const items=ref([]);
const docs=ref([]);

const saving=ref(false);
const uploading=ref(false);
const deletingDoc=ref(null);
const formError=ref(null);

const editingItems=ref(false);
const editItems=ref([]);

const canSendToEng=computed(()=>detail.value&&["CREATED","CONFIRMED","REJECTED"].includes(detail.value.status));

function docsFor(type){
return docs.value.filter(d=>d.doc_type===type);
}

function statusClass(s){
if(s==="REJECTED")return "reject-pill";
if(s==="SENT_TO_ENG")return "blue-pill";
if(s==="CONFIRMED")return "green-pill";
if(s==="CREATED")return "grey-pill";
return "";
}

function formatDate(date){
if(!date)return "-";
return new Date(date).toLocaleDateString("en-MY");
}

async function loadOrders(){
loading.value=true;
error.value=null;

const {data,error:err}=await supabase
.from("sales_orders")
.select("*,customers(customer_name)")
.order("order_date",{ascending:false});

if(err)error.value=err.message;
else orders.value=data||[];

loading.value=false;
}

async function openDetail(order){
detail.value=order;
formError.value=null;
editingItems.value=false;

const [itemsRes,docsRes]=await Promise.all([
supabase.from("sales_order_items")
.select("*")
.eq("sales_order_id",order.id),

supabase.from("documents")
.select("*")
.eq("owner_type","SALES_ORDER")
.eq("owner_id",order.id)
.eq("doc_type","CUSTOMER_DRAWING")
.order("created_at",{ascending:false})
]);

items.value=itemsRes.data||[];
docs.value=docsRes.data||[];
}

function closeDetail(){
detail.value=null;
formError.value=null;
}

async function handleUpload(event){
const file=event.target.files?.[0];
event.target.value="";

if(!file||!detail.value)return;

uploading.value=true;
formError.value=null;

const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
const path=`sales-orders/${detail.value.id}/customer-drawing-${Date.now()}-${safeName}`;

const {error:uploadErr}=await supabase.storage
.from("documents")
.upload(path,file,{cacheControl:"3600",upsert:false});

if(uploadErr){
formError.value=uploadErr.message;
uploading.value=false;
return;
}

const {data:urlData}=supabase.storage
.from("documents")
.getPublicUrl(path);

const {data:{user}}=await supabase.auth.getUser();

const {error:docErr}=await supabase
.from("documents")
.insert({
owner_type:"SALES_ORDER",
owner_id:detail.value.id,
doc_type:"CUSTOMER_DRAWING",
file_name:file.name,
file_url:urlData.publicUrl,
uploaded_by:user?.id||null
});

if(docErr){
await supabase.storage.from("documents").remove([path]);
formError.value=docErr.message;
uploading.value=false;
return;
}

const {data:refreshed}=await supabase
.from("documents")
.select("*")
.eq("owner_type","SALES_ORDER")
.eq("owner_id",detail.value.id)
.eq("doc_type","CUSTOMER_DRAWING")
.order("created_at",{ascending:false});

docs.value=refreshed||[];
uploading.value=false;
}

function getStoragePath(url){
if(!url)return null;

const marker="/storage/v1/object/public/documents/";
const index=url.indexOf(marker);

if(index===-1)return null;

return decodeURIComponent(url.substring(index+marker.length));
}

async function removeDrawing(doc){
if(!confirm(`Remove "${doc.file_name}"?`))return;

deletingDoc.value=doc.id;
formError.value=null;

try{
const path=getStoragePath(doc.file_url);

if(path){
const {error:storageErr}=await supabase.storage
.from("documents")
.remove([path]);

if(storageErr){
formError.value=storageErr.message;
deletingDoc.value=null;
return;
}
}

const {error:dbErr}=await supabase
.from("documents")
.delete()
.eq("id",doc.id);

if(dbErr){
formError.value=dbErr.message;
deletingDoc.value=null;
return;
}

docs.value=docs.value.filter(d=>d.id!==doc.id);

}catch(e){
formError.value=e.message||"Failed to remove drawing.";
}

deletingDoc.value=null;
}

function startEditItems(){
editItems.value=items.value.map(i=>({...i}));
editingItems.value=true;
formError.value=null;
}

async function saveItemCorrections(){
saving.value=true;
formError.value=null;

const {error:delErr}=await supabase
.from("sales_order_items")
.delete()
.eq("sales_order_id",detail.value.id);

if(delErr){
formError.value=delErr.message;
saving.value=false;
return;
}

const rows=editItems.value
.filter(i=>i.part_number&&i.part_name)
.map(i=>({
sales_order_id:detail.value.id,
part_number:i.part_number.trim(),
part_name:i.part_name.trim(),
quantity:i.quantity,
remarks:i.remarks||null
}));

if(rows.length){
const {error:insErr}=await supabase
.from("sales_order_items")
.insert(rows);

if(insErr){
formError.value=insErr.message;
saving.value=false;
return;
}
}

const {data}=await supabase
.from("sales_order_items")
.select("*")
.eq("sales_order_id",detail.value.id);

items.value=data||[];
editingItems.value=false;
saving.value=false;
}

async function sendToEng(){
saving.value=true;
formError.value=null;

const wasRejected=detail.value.status==="REJECTED";

const {error:err}=await supabase
.from("sales_orders")
.update({
status:"SENT_TO_ENG",
...(wasRejected?{
rejection_reason:null,
reviewed_by:null,
reviewed_at:null
}:{})
})
.eq("id",detail.value.id);

if(err){
formError.value=err.message;
saving.value=false;
return;
}

await supabase.from("order_status_history").insert({
sales_order_id:detail.value.id,
status:"SENT_TO_ENG",
note:wasRejected
?"Corrected and resent by Business Development"
:"Sent by Business Development for Engineering verification"
});

detail.value.status="SENT_TO_ENG";

if(wasRejected){
detail.value.rejection_reason=null;
detail.value.reviewed_by=null;
detail.value.reviewed_at=null;
}

saving.value=false;
await loadOrders();
}

onMounted(loadOrders);
</script>

<style scoped>
.page{padding:24px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:18px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;color:#888;font-size:11px;text-transform:uppercase;padding:10px;border-bottom:1px solid #eee}
td{padding:11px 10px;border-bottom:1px solid #f0f0f0}
tr.rejected{background:#fff8f8}
.view-btn{border:0;background:none;color:#3f51b5;cursor:pointer;font-size:12px;font-weight:600}
.primary{background:#3f51b5;color:#fff;border:0;padding:9px 16px;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600}
.primary:disabled{opacity:.6;cursor:not-allowed}
.secondary{background:#eee;border:0;padding:8px 14px;border-radius:5px;cursor:pointer}
.loading,.empty{text-align:center;padding:20px;color:#999}
.error{color:#c62828;font-size:12px;margin-top:10px}

.pill{display:inline-block;padding:4px 9px;border-radius:12px;font-size:10px;font-weight:700;background:#eee;color:#666}
.reject-pill{background:#ffebee;color:#c62828}
.blue-pill{background:#e3f2fd;color:#1565c0}
.green-pill{background:#e8f5e9;color:#2e7d32}
.grey-pill{background:#eee;color:#777}

.modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
.modal{width:700px;max-width:95vw;max-height:92vh;overflow:auto;background:#fff;border-radius:12px;box-shadow:0 15px 45px rgba(0,0,0,.2)}

.modal-header{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid #eee;position:sticky;top:0;background:#fff;z-index:2}
.order-title{font-size:18px;font-weight:700;color:#222}
.order-subtitle{font-size:12px;color:#888;margin-top:3px}
.header-right{display:flex;align-items:center;gap:12px}
.icon-btn{border:0;background:none;color:#888;font-size:17px;cursor:pointer}

.banner{margin:16px 24px 0;padding:12px 14px;border-radius:7px;font-size:12px}
.banner.reject{background:#fff0f0;color:#c62828;border:1px solid #ffcdd2}
.banner.approve{background:#edf8ef;color:#2e7d32;display:flex;justify-content:space-between}
.banner-title{font-weight:700;margin-bottom:4px}

.section{padding:20px 24px;border-bottom:1px solid #f0f0f0}
.section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.section-head h3{margin:0;font-size:13px;color:#333}
.section-desc{font-size:11px;color:#999;margin:4px 0 0}

.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.info-card{background:#f8f9fc;border:1px solid #edf0f5;border-radius:7px;padding:11px}
.info-card span{display:block;color:#999;font-size:10px;margin-bottom:4px}
.info-card strong{font-size:13px;color:#333;font-weight:600}

.inner-table{font-size:12px;border:1px solid #eee;border-radius:6px;overflow:hidden}
.inner-table th{font-size:10px;background:#fafafa}
.inner-table td{font-size:12px}

.outline-btn{background:#fff;border:1px solid #c5cae9;color:#3f51b5;border-radius:5px;padding:6px 10px;font-size:11px;cursor:pointer}
.edit-box{background:#fafbff;border:1px solid #e5e7f5;border-radius:7px;padding:12px}
.edit-row{display:grid;grid-template-columns:1fr 1fr 80px 1fr auto;gap:7px;margin-bottom:7px}
.edit-row input{min-width:0}
input{padding:8px;border:1px solid #d1d5db;border-radius:5px;font-size:12px}
.remove-btn{border:0;background:none;color:#c62828;font-size:11px;cursor:pointer}
.link{border:0;background:none;color:#3f51b5;font-size:11px;cursor:pointer;padding:4px 0}
.edit-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:12px}

.upload-btn{background:#eef0ff;color:#3f51b5;border:1px solid #d5d9ff;padding:7px 12px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer}
.drawing-list{display:flex;flex-direction:column;gap:8px}
.drawing-card{display:flex;justify-content:space-between;align-items:center;border:1px solid #e4e6eb;border-radius:7px;padding:11px 12px;background:#fafbfc}
.drawing-info{display:flex;align-items:center;gap:10px;min-width:0}
.drawing-icon{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:#eef0ff;border-radius:6px;font-size:17px}
.drawing-name{display:block;color:#3f51b5;font-size:12px;font-weight:600;max-width:380px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.drawing-date{font-size:10px;color:#999;margin-top:3px}
.drawing-actions{display:flex;gap:6px}
.small-btn{border:1px solid #ddd;background:#fff;color:#555;padding:5px 9px;border-radius:4px;font-size:10px;cursor:pointer;text-decoration:none}
.danger-btn{color:#c62828;background:#fff5f5;border-color:#ffcdd2}
.danger-btn:disabled{opacity:.6}

.empty-document{border:1px dashed #d5d7dc;border-radius:8px;padding:22px;text-align:center;background:#fafafa}
.empty-icon{font-size:25px;margin-bottom:6px}
.empty-document strong{display:block;font-size:12px;color:#555}
.empty-document span{display:block;font-size:10px;color:#999;margin-top:4px}

.modal-footer{padding:16px 24px;display:flex;justify-content:flex-end;background:#fafbfc}
.send-btn{padding:10px 18px}
</style>
```
