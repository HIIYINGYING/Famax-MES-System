<template>
  <div class="page">
    <h1>{{ title }}</h1>

    <div class="tabs">
      <button :class="{ active: tab === 'status' }" @click="tab = 'status'">Status</button>
      <button :class="{ active: tab === 'procurement' }" @click="tab = 'procurement'">Procurement</button>
      <button :class="{ active: tab === 'master' }" @click="tab = 'master'">{{ title }} Master List</button>
    </div>

    <!-- STATUS: all requests for this category (Prepared / In Procurement / Done) -->
    <div v-if="tab === 'status'" class="card">
      <p class="status-hint">Pending → Prepared (in stock, ready to issue) → Under Procurement (out of stock, ordered from supplier) → Done.</p>
      <div v-if="loading" class="loading">Loading…</div>
      <table v-else>
        <thead>
          <tr><th>Request Date</th><th>{{ nameLabel }}</th><th v-if="category==='GAUGE'">For Process</th><th>Available</th><th>Requested</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in requests" :key="r.id" class="hoverable" @click="openDetail(r)">
            <td>{{ r.request_date }}</td>
            <td>{{ r.inventory_items?.item_name }}</td>
            <td v-if="category==='GAUGE'">{{ r.inventory_items?.for_process || "-" }}</td>
            <td>{{ r.number_available }}</td>
            <td>{{ r.number_requested }}</td>
            <td><span class="pill" :class="statusClass(r.status)">{{ statusLabel(r.status) }}</span></td>
          </tr>
          <tr v-if="requests.length === 0"><td colspan="6" class="empty">No requests yet.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- PROCUREMENT: requests currently under procurement -->
    <div v-if="tab === 'procurement'" class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <table v-else>
        <thead><tr><th>Request Date</th><th>Supplier</th><th>{{ nameLabel }}</th><th>Required Qty</th><th>Est. Arrival</th><th>Status</th></tr></thead>
        <tbody>
          <tr v-for="r in procurementRequests" :key="r.id" class="hoverable" @click="openDetail(r)">
            <td>{{ r.request_date }}</td>
            <td>{{ r.partners?.name || "-" }}</td>
            <td>{{ r.inventory_items?.item_name }}</td>
            <td>{{ r.number_requested }}</td>
            <td>{{ r.expected_arrival ? new Date(r.expected_arrival).toLocaleDateString() : "-" }}</td>
            <td><span class="pill" :class="statusClass(r.status)">{{ statusLabel(r.status) }}</span></td>
          </tr>
          <tr v-if="procurementRequests.length === 0"><td colspan="6" class="empty">Nothing under procurement.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- MASTER LIST -->
    <div v-if="tab === 'master'">
      <div class="page-header">
        <button class="primary" @click="showCreate = !showCreate">{{ showCreate ? "Cancel" : "Create New " + title }}</button>
      </div>

      <form v-if="showCreate" class="card form-grid" @submit.prevent="createItem">
        <div v-if="category==='RAW_MATERIAL'"><label>Material Category</label><input v-model="form.material_category" placeholder="e.g. Brass Rods & Bars" /></div>
        <div><label>Item Code</label><input v-model="form.item_code" required /></div>
        <div><label>{{ nameLabel }}</label><input v-model="form.item_name" required /></div>
        <div v-if="category==='RAW_MATERIAL'"><label>Grade</label><input v-model="form.grade" /></div>
        <div v-if="category==='RAW_MATERIAL'"><label>Size</label><input v-model="form.size" /></div>
        <div v-if="category==='RAW_MATERIAL'"><label>Unit of Measure</label><input v-model="form.unit_of_measure" placeholder="e.g. KG, M, PCS" /></div>
        <div v-if="category==='TOOLING'"><label>Specification</label><input v-model="form.specification" /></div>
        <div v-if="category==='TOOLING'"><label>Size</label><input v-model="form.size" /></div>
        <div v-if="category==='TOOLING'"><label>Supplier</label>
          <select v-model="form.supplier_partner_id"><option value="">-</option><option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option></select>
        </div>
        <div v-if="category==='GAUGE'"><label>For Process</label><input v-model="form.for_process" /></div>
        <div v-if="category==='GAUGE'"><label>Supplier</label>
          <select v-model="form.supplier_partner_id"><option value="">-</option><option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option></select>
        </div>
        <div><label>Storage Location / Rack</label><input v-model="form.shelf" /></div>
        <div><label>Initial Quantity</label><input v-model.number="form.stock_balance" type="number" required /></div>
        <div class="span-2">
          <button class="primary" type="submit" :disabled="saving">{{ saving ? "Saving…" : "Submit" }}</button>
        </div>
        <p v-if="formError" class="error span-2">{{ formError }}</p>
      </form>

      <div class="card">
        <div v-if="loading" class="loading">Loading…</div>
        <table v-else>
          <thead>
            <tr>
              <th v-if="category==='RAW_MATERIAL'">Category</th>
              <th>{{ nameLabel }}</th>
              <th v-if="category==='RAW_MATERIAL'">Grade</th>
              <th v-if="category==='RAW_MATERIAL'">Size</th>
              <th v-if="category==='TOOLING'">Specification</th>
              <th v-if="category==='GAUGE'">For Process</th>
              <th>Location</th><th>Available</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td v-if="category==='RAW_MATERIAL'">{{ item.material_category || "-" }}</td>
              <td>{{ item.item_name }}</td>
              <td v-if="category==='RAW_MATERIAL'">{{ item.grade || "-" }}</td>
              <td v-if="category==='RAW_MATERIAL'">{{ item.size || "-" }}</td>
              <td v-if="category==='TOOLING'">{{ item.specification || "-" }}</td>
              <td v-if="category==='GAUGE'">{{ item.for_process || "-" }}</td>
              <td>{{ item.shelf || "-" }}</td>
              <td>{{ item.stock_balance }}</td>
              <td><span class="pill" :class="stockStatusClass(item.status)">{{ item.status.replace('_',' ') }}</span></td>
            </tr>
            <tr v-if="items.length === 0"><td colspan="8" class="empty">No {{ title.toLowerCase() }} registered.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- DETAIL POPUP (order / customer / part / remarks / documents) -->
    <div v-if="detail" class="modal-backdrop" @click.self="detail = null">
      <div class="modal">
        <h2>{{ detail.inventory_items?.item_name }}</h2>
        <dl>
          <dt>Order No</dt><dd>{{ detail.order_no || "-" }}</dd>
          <dt>Customer</dt><dd>{{ detail.customers?.customer_name || "-" }}</dd>
          <dt>Part No / Name</dt><dd>{{ detail.part_no || "-" }} / {{ detail.part_name || "-" }}</dd>
          <dt>Remarks</dt><dd>{{ detail.remarks || "-" }}</dd>
          <dt>Customer Drawing</dt><dd><a v-if="detail.customer_drawing_url" :href="detail.customer_drawing_url" target="_blank">View</a><span v-else>-</span></dd>
          <dt>PO Receipt</dt><dd><a v-if="detail.po_receipt_url" :href="detail.po_receipt_url" target="_blank">View</a><span v-else>-</span></dd>
        </dl>
        <button @click="detail = null">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { supabase } from "@/lib/supabase";

const props = defineProps({
  category: { type: String, required: true },
  title: { type: String, required: true },
  nameLabel: { type: String, default: "Name" },
});

const tab = ref("status");
const requests = ref([]);
const items = ref([]);
const suppliers = ref([]);
const loading = ref(true);
const detail = ref(null);

const showCreate = ref(false);
const saving = ref(false);
const formError = ref(null);
const form = reactive({
  material_category: "", item_code: "", item_name: "", grade: "", size: "",
  unit_of_measure: "", specification: "", for_process: "", supplier_partner_id: "",
  shelf: "", stock_balance: 0,
});

const procurementRequests = computed(() => requests.value.filter((r) => r.status === "IN_PROGRESS"));

function statusLabel(s) {
  if (s === "PENDING") return "Pending";
  if (s === "PREPARED") return "Prepared";
  if (s === "IN_PROGRESS") return "Under Procurement";
  return "Done";
}
function statusClass(s) {
  if (s === "PENDING") return "grey";
  if (s === "PREPARED") return "blue";
  if (s === "IN_PROGRESS") return "amber";
  return "green";
}
function stockStatusClass(s) {
  if (s === "IN_STOCK") return "green";
  if (s === "LOW_STOCK") return "amber";
  return "red";
}
function deriveStatus(qty) {
  if (qty <= 0) return "OUT_OF_STOCK";
  if (qty < 5) return "LOW_STOCK";
  return "IN_STOCK";
}

async function loadRequests() {
  const { data } = await supabase
    .from("procurement_requests")
    .select("*, inventory_items!inner(item_name, for_process, category), partners(name), customers(customer_name)")
    .eq("inventory_items.category", props.category)
    .order("request_date", { ascending: false });
  requests.value = data ?? [];
}

async function loadItems() {
  const { data } = await supabase.from("inventory_items").select("*").eq("category", props.category).order("item_name");
  items.value = data ?? [];
}

async function loadSuppliers() {
  const { data } = await supabase.from("partners").select("id, name").eq("partner_type", "SUPPLIER").eq("status", "ACTIVE");
  suppliers.value = data ?? [];
}

async function loadAll() {
  loading.value = true;
  await Promise.all([loadRequests(), loadItems(), loadSuppliers()]);
  loading.value = false;
}

function openDetail(r) { detail.value = r; }

async function createItem() {
  saving.value = true;
  formError.value = null;
  const { error: err } = await supabase.from("inventory_items").insert({
    category: props.category,
    item_code: form.item_code,
    item_name: form.item_name,
    material_category: form.material_category || null,
    grade: form.grade || null,
    size: form.size || null,
    unit_of_measure: form.unit_of_measure || null,
    specification: form.specification || null,
    for_process: form.for_process || null,
    supplier_partner_id: form.supplier_partner_id || null,
    shelf: form.shelf || null,
    stock_balance: form.stock_balance,
    status: deriveStatus(form.stock_balance),
  });
  saving.value = false;
  if (err) { formError.value = err.message; return; }
  showCreate.value = false;
  Object.assign(form, { material_category: "", item_code: "", item_name: "", grade: "", size: "", unit_of_measure: "", specification: "", for_process: "", supplier_partner_id: "", shelf: "", stock_balance: 0 });
  loadItems();
}

watch(() => props.category, loadAll);
onMounted(loadAll);
</script>

<style scoped>
.page { padding: 24px; }
.page h1 { font-size: 20px; margin: 0 0 16px; }
.page-header { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.tabs { display: flex; gap: 4px; margin-bottom: 12px; }
.tabs button { padding: 8px 16px; border: 1px solid #e2e2e2; background: #fff; border-radius: 4px 4px 0 0; cursor: pointer; font-size: 13px; color: #666; }
.tabs button.active { background: #3f51b5; color: #fff; border-color: #3f51b5; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
.status-hint { font-size: 11px; color: #999; margin: 0 0 10px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
input, select { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
tr.hoverable { cursor: pointer; }
tr.hoverable:hover { background: #f7f7f9; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.amber { background: #fff8e1; color: #f57f17; }
.pill.blue { background: #e3f2fd; color: #1565c0; }
.pill.red { background: #ffebee; color: #c62828; }
.pill.grey { background: #eee; color: #777; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.error { color: #c62828; font-size: 13px; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; padding: 24px; border-radius: 8px; width: 420px; }
.modal dl { display: grid; grid-template-columns: 130px 1fr; row-gap: 8px; font-size: 13px; margin-bottom: 16px; }
.modal dt { color: #888; }
</style>