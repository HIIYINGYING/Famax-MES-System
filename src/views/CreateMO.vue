<template>
  <div class="page">
    <h1>Manufacturing Order</h1>
    <p class="subtitle">Create MO from a verified Sales Order</p>

    <div class="card">
      <label>Sales Order (sent for engineering review)</label>
      <select v-model="selectedOrderId" @change="onOrderSelected">
        <option disabled value="">Select order…</option>
        <option v-for="o in pendingOrders" :key="o.id" :value="o.id">
          {{ o.order_no }} — {{ o.customers?.customer_name }}
        </option>
      </select>
      <p v-if="pendingOrders.length === 0" class="hint">No orders currently awaiting engineering review.</p>
    </div>

    <div v-if="selectedOrder" class="card">
      <h3>Order Details <span class="badge">Auto-filled from {{ selectedOrder.order_no }}</span></h3>
      <div class="info-grid">
        <div><span class="k">Customer</span><span class="v">{{ selectedOrder.customers?.customer_name }}</span></div>
        <div><span class="k">Order Date</span><span class="v">{{ selectedOrder.order_date }}</span></div>
        <div><span class="k">Due Date</span><span class="v">{{ selectedOrder.due_date || "-" }}</span></div>
        <div><span class="k">Remarks</span><span class="v">{{ selectedOrder.remarks || "-" }}</span></div>
      </div>

      <h3 class="doc-heading">Customer Drawing</h3>
      <a v-if="customerDrawing" :href="customerDrawing.file_url" target="_blank" class="doc-link">
        📎 {{ customerDrawing.file_name }}
      </a>
      <span v-else class="doc-missing">No customer drawing uploaded yet.</span>

      <h3>Line Items — select which to create an MO for</h3>
      <table>
        <thead><tr><th></th><th>Part Number</th><th>Part Name</th><th>Quantity</th><th>MO Status</th></tr></thead>
        <tbody>
          <tr v-for="item in orderItems" :key="item.id">
            <td><input type="radio" :value="item.id" v-model="selectedItemId" @change="onItemSelected" /></td>
            <td>{{ item.part_number }}</td>
            <td>{{ item.part_name }}</td>
            <td>{{ item.quantity }}</td>
            <td>
              <span v-if="existingMoFor(item.id)" class="pill green">Already created ({{ existingMoFor(item.id).mo_no }})</span>
              <span v-else class="pill grey">Not yet created</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <form v-if="selectedItemId && !existingMoFor(selectedItemId)" class="card form-grid" @submit.prevent="createMO">
      <h3 class="span-2">New Manufacturing Order <span class="badge">Auto-filled — adjust remarks as needed</span></h3>
      <div><label>MO No</label><input v-model="form.mo_no" required /></div>
      <div><label>Part Number</label><input v-model="form.part_number" disabled /></div>
      <div><label>Part Name</label><input v-model="form.part_name" disabled /></div>
      <div><label>Quantity</label><input v-model.number="form.quantity" type="number" disabled /></div>
      <div class="span-2"><label>Remarks / Manufacturing Instructions</label>
        <textarea v-model="form.remarks" rows="2" placeholder="e.g. Manufacture according to approved customer drawing and specification."></textarea>
      </div>
      <div class="span-2">
        <button class="primary" type="submit" :disabled="saving">{{ saving ? "Creating…" : "Create Manufacturing Order" }}</button>
      </div>
      <p v-if="formError" class="error span-2">{{ formError }}</p>
    </form>

    <div class="card">
      <h3>Recent Manufacturing Orders</h3>
      <table>
        <thead><tr><th>MO No</th><th>Order No</th><th>Part Name</th><th>Quantity</th><th>Status</th></tr></thead>
        <tbody>
          <tr v-for="mo in recentMOs" :key="mo.id">
            <td>{{ mo.mo_no }}</td>
            <td>{{ mo.sales_orders?.order_no }}</td>
            <td>{{ mo.part_name }}</td>
            <td>{{ mo.quantity }}</td>
            <td><span class="pill">{{ mo.status }}</span></td>
          </tr>
          <tr v-if="recentMOs.length === 0"><td colspan="5" class="empty">No manufacturing orders created yet.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader.vue";

const pendingOrders = ref([]);
const selectedOrderId = ref("");
const selectedOrder = ref(null);
const orderItems = ref([]);
const existingMOs = ref([]);
const customerDrawing = ref(null);
const recentMOs = ref([]);

const selectedItemId = ref("");
const saving = ref(false);
const formError = ref(null);
const form = reactive({ mo_no: "", part_number: "", part_name: "", quantity: 0, remarks: "" });

function existingMoFor(itemId) {
  return existingMOs.value.find((mo) => mo.sales_order_item_id === itemId);
}

async function loadPendingOrders() {
  const { data } = await supabase
    .from("sales_orders")
    .select("*, customers(customer_name)")
    .eq("status", "SENT_TO_ENG")
    .order("order_date", { ascending: false });
  pendingOrders.value = data ?? [];
}

async function loadRecentMOs() {
  const { data } = await supabase
    .from("manufacturing_orders")
    .select("*, sales_orders(order_no)")
    .order("created_at", { ascending: false })
    .limit(10);
  recentMOs.value = data ?? [];
}

async function onOrderSelected() {
  selectedItemId.value = "";
  customerDrawing.value = null;
  selectedOrder.value = pendingOrders.value.find((o) => o.id === selectedOrderId.value);
  if (!selectedOrder.value) return;

  const [itemsRes, mosRes, docsRes] = await Promise.all([
    supabase.from("sales_order_items").select("*").eq("sales_order_id", selectedOrder.value.id),
    supabase.from("manufacturing_orders").select("*").eq("sales_order_id", selectedOrder.value.id),
    supabase.from("documents").select("*").eq("owner_type", "SALES_ORDER").eq("owner_id", selectedOrder.value.id).eq("doc_type", "CUSTOMER_DRAWING"),
  ]);
  orderItems.value = itemsRes.data ?? [];
  existingMOs.value = mosRes.data ?? [];
  customerDrawing.value = docsRes.data?.[0] || null;
}

function onItemSelected() {
  const item = orderItems.value.find((i) => i.id === selectedItemId.value);
  if (!item) return;
  // ---- AUTO-FILL: part number, name, and quantity come straight
  // from the sales order line item — nothing to re-type ----
  form.part_number = item.part_number;
  form.part_name = item.part_name;
  form.quantity = item.quantity;
  form.mo_no = `MO-${selectedOrder.value.order_no.replace("SO-", "")}`;
  form.remarks = "Manufacture according to approved customer drawing and specification.";
  formError.value = null;
}

async function createMO() {
  saving.value = true;
  formError.value = null;
  const { error: err } = await supabase.from("manufacturing_orders").insert({
    mo_no: form.mo_no,
    sales_order_id: selectedOrder.value.id,
    sales_order_item_id: selectedItemId.value,
    part_number: form.part_number,
    part_name: form.part_name,
    quantity: form.quantity,
    remarks: form.remarks || null,
  });
  saving.value = false;
  if (err) { formError.value = err.message; return; }

  selectedItemId.value = "";
  await onOrderSelected();
  loadRecentMOs();
}

onMounted(() => {
  loadPendingOrders();
  loadRecentMOs();
});
</script>

<style scoped>
.page { padding: 24px; }
h1 {margin: 0 0 4px; font-size: 20px; }
.subtitle {margin: 0 0 24px; color: #777; font-size: 13px }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 18px; margin-bottom: 16px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
input:disabled { background: #f5f5f5; color: #555; font-weight: 600; }
h3 { font-size: 13px; margin: 16px 0 10px; color: #333; }
h3:first-child, .doc-heading { margin-top: 0; }
.badge { font-size: 10px; font-weight: 500; color: #3f51b5; background: #eef0ff; padding: 2px 8px; border-radius: 10px; margin-left: 8px; text-transform: none; }
.hint { font-size: 12px; color: #999; margin-top: 8px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px; }
.info-grid .k { display: block; font-size: 11px; color: #999; }
.info-grid .v { display: block; font-size: 14px; font-weight: 500; }
.doc-link { color: #3f51b5; font-size: 13px; }
.doc-missing { color: #aaa; font-size: 13px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: #e8edff; color: #3f51b5; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.grey { background: #eee; color: #777; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.primary:disabled { opacity: 0.6; cursor: not-allowed; }
.error { color: #c62828; font-size: 13px; }
.empty { text-align: center; color: #999; }
</style>