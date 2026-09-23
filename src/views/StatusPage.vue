<template>
  <div class="page">
    <PageHeader title="Order Status" subtitle="Track ongoing processing and hand-off between departments" />

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="error" class="error">{{ error }}</div>

      <table v-else>
        <thead>
          <tr><th>Order Date</th><th>Order No</th><th>Customer</th><th>Current Process</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td>{{ o.order_date }}</td>
            <td>{{ o.order_no }}</td>
            <td>{{ o.customers?.customer_name }}</td>
            <td><span class="pill handler">{{ currentHandler(o.status) }}</span></td>
            <td><span class="pill">{{ o.status }}</span></td>
            <td><a href="#" @click.prevent="openDetail(o)">View</a></td>
          </tr>
          <tr v-if="orders.length === 0"><td colspan="6" class="empty">No orders yet.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ==================== FORMAL DETAIL MODAL ==================== -->
    <div v-if="detail" class="modal-backdrop" @click.self="closeDetail">
      <div class="modal">
        <header class="modal-header">
          <div>
            <span class="order-no">{{ detail.order_no }}</span>
            <span class="pill status">{{ detail.status }}</span>
          </div>
          <button class="icon-btn" @click="closeDetail">✕</button>
        </header>

        <div v-if="detail.status === 'REJECTED'" class="banner reject">
          <strong>Rejected by Engineering</strong>
          <p>{{ detail.rejection_reason || "No reason provided." }}</p>
        </div>
        <div v-else-if="detail.reviewed_by && detail.status !== 'CREATED'" class="banner approve">
          <strong>Approved by Engineering — moved to Development</strong>
          <span class="banner-date">{{ detail.reviewed_at ? new Date(detail.reviewed_at).toLocaleDateString() : "" }}</span>
        </div>

        <section class="info-block">
          <div class="info-grid">
            <div><span class="k">Customer</span><span class="v">{{ detail.customers?.customer_name }}</span></div>
            <div><span class="k">Order Date</span><span class="v">{{ detail.order_date }}</span></div>
            <div><span class="k">Due Date</span><span class="v">{{ detail.due_date || "-" }}</span></div>
            <div><span class="k">Remarks</span><span class="v">{{ detail.remarks || "-" }}</span></div>
          </div>
        </section>

        <section class="info-block">
          <h3>Order Items</h3>
          <table class="inner-table">
            <thead><tr><th>Part Number</th><th>Part Name</th><th>Quantity</th><th>Remarks</th></tr></thead>
            <tbody>
              <tr v-for="item in items" :key="item.id">
                <td>{{ item.part_number }}</td>
                <td>{{ item.part_name }}</td>
                <td>{{ item.quantity }}</td>
                <td>{{ item.remarks || "-" }}</td>
              </tr>
              <tr v-if="items.length === 0"><td colspan="4" class="empty">No line items.</td></tr>
            </tbody>
          </table>
        </section>

        <section class="info-block">
          <h3>Customer Drawing</h3>
          <div class="doc-grid single">
            <div class="doc-card-multi">
              <div class="doc-card-header">
                <span class="doc-icon">📐</span>
                <span class="doc-title">Customer Drawing</span>
                <label class="doc-action">
                  {{ uploading === 'CUSTOMER_DRAWING' ? "Uploading…" : "+ Add" }}
                  <input type="file" hidden @change="e => handleUpload(e, 'CUSTOMER_DRAWING')" />
                </label>
              </div>
              <ul v-if="docsFor('CUSTOMER_DRAWING').length" class="doc-file-list">
                <li v-for="d in docsFor('CUSTOMER_DRAWING')" :key="d.id">
                  <a :href="d.file_url" target="_blank">{{ d.file_name }}</a>
                  <span class="doc-meta">{{ new Date(d.uploaded_at).toLocaleDateString() }}</span>
                </li>
              </ul>
              <p v-else class="doc-empty-text">No files uploaded</p>
            </div>
          </div>
          <p class="doc-note">Process images and Work Instruction are added by Engineering during development.</p>
        </section>

        <section class="info-block">
          <h3>Request Material / Tooling / Gauge</h3>
          <div class="request-row">
            <select v-model="reqForm.category">
              <option value="RAW_MATERIAL">Raw Material</option>
              <option value="TOOLING">Tooling</option>
              <option value="GAUGE">Gauge</option>
            </select>
            <select v-model="reqForm.inventory_item_id">
              <option disabled value="">Select item…</option>
              <option v-for="i in itemsForCategory" :key="i.id" :value="i.id">{{ i.item_name }}</option>
            </select>
            <input v-model.number="reqForm.quantity" type="number" placeholder="Qty" style="width:80px" />
            <button class="secondary" @click="submitRequest" :disabled="requestSaving">
              {{ requestSaving ? "Sending…" : "Request" }}
            </button>
          </div>
          <p v-if="requestConfirmation" class="confirm">{{ requestConfirmation }}</p>

          <table v-if="requestedItems.length" class="inner-table requested-table">
            <thead><tr><th>Category</th><th>Item</th><th>Qty Requested</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="r in requestedItems" :key="r.id">
                <td><span class="pill cat">{{ categoryLabel(r.inventory_items?.category) }}</span></td>
                <td>{{ r.inventory_items?.item_name }}</td>
                <td>{{ r.number_requested }}</td>
                <td><span class="pill" :class="reqStatusClass(r.status)">{{ reqStatusLabel(r.status) }}</span></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="info-block">

          <h3>History</h3>
          <table class="inner-table">
            <thead><tr><th>Date</th><th>Status</th><th>Note</th></tr></thead>
            <tbody>
              <tr v-for="h in history" :key="h.id">
                <td>{{ new Date(h.changed_at).toLocaleDateString() }}</td>
                <td>{{ h.status }}</td>
                <td>{{ h.note || "-" }}</td>
              </tr>
              <tr v-if="history.length === 0"><td colspan="3" class="empty">No history recorded.</td></tr>
            </tbody>
          </table>
        </section>

        <footer class="modal-footer">
          <button v-if="detail.status === 'CREATED'" class="secondary" @click="confirmOrder" :disabled="saving">
            {{ saving ? "Confirming…" : "Confirm Order" }}
          </button>
          <button v-if="canSendToEng" class="primary" @click="sendToEng" :disabled="saving">
            {{ saving ? "Sending…" : "Send to ENG for Verification" }}
          </button>
        </footer>
        <p v-if="formError" class="error">{{ formError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader.vue";

function currentHandler(status) {
  const map = {
    CREATED: "Business Development",
    CONFIRMED: "Business Development",
    SENT_TO_ENG: "Engineering",
    IN_PROGRESS: "Production",
    COMPLETED: "Completed",
    REJECTED: "Business Development",
  };
  return map[status] || "-";
}

const orders = ref([]);
const loading = ref(true);
const error = ref(null);
const saving = ref(false);
const formError = ref(null);

const detail = ref(null);
const items = ref([]);
const docs = ref([]);
const history = ref([]);
const uploading = ref(null);
const inventoryItems = ref([]);
const requestSaving = ref(false);
const requestConfirmation = ref("");
const requestedItems = ref([]);
const reqForm = reactive({ category: "RAW_MATERIAL", inventory_item_id: "", quantity: 1 });

const canSendToEng = computed(() => detail.value && ["CREATED", "CONFIRMED"].includes(detail.value.status));
const itemsForCategory = computed(() => inventoryItems.value.filter((i) => i.category === reqForm.category));

function docsFor(type) {
  return docs.value.filter((d) => d.doc_type === type);
}

function categoryLabel(c) {
  if (c === "RAW_MATERIAL") return "Raw Material";
  if (c === "TOOLING") return "Tooling";
  if (c === "GAUGE") return "Gauge";
  return c || "-";
}
function reqStatusLabel(s) {
  if (s === "PENDING") return "Pending";
  if (s === "PREPARED") return "Prepared";
  if (s === "IN_PROGRESS") return "Under Procurement";
  return "Done";
}
function reqStatusClass(s) {
  if (s === "PENDING") return "grey";
  if (s === "PREPARED") return "blue";
  if (s === "IN_PROGRESS") return "amber";
  return "green";
}

async function loadOrders() {
  loading.value = true;
  const { data, error: err } = await supabase
    .from("sales_orders")
    .select("*, customers(customer_name)")
    .order("order_date", { ascending: false });
  if (err) error.value = err.message;
  else orders.value = data;
  loading.value = false;
}

async function loadInventoryItems() {
  const { data } = await supabase.from("inventory_items").select("id, item_name, category");
  inventoryItems.value = data ?? [];
}

async function openDetail(order) {
  detail.value = order;
  formError.value = null;
  requestConfirmation.value = "";
  const [itemsRes, docsRes, historyRes] = await Promise.all([
    supabase.from("sales_order_items").select("*").eq("sales_order_id", order.id),
    supabase.from("documents").select("*").eq("owner_type", "SALES_ORDER").eq("owner_id", order.id),
    supabase.from("order_status_history").select("*").eq("sales_order_id", order.id).order("changed_at"),
  ]);
  items.value = itemsRes.data ?? [];
  docs.value = docsRes.data ?? [];
  history.value = historyRes.data ?? [];
  await loadRequestedItems();
}

async function loadRequestedItems() {
  if (!detail.value) return;
  const { data } = await supabase
    .from("procurement_requests")
    .select("*, inventory_items(item_name, category)")
    .eq("sales_order_id", detail.value.id)
    .order("created_at", { ascending: false });
  requestedItems.value = data ?? [];
}

function closeDetail() {
  detail.value = null;
}

async function handleUpload(event, docType) {
  const file = event.target.files[0];
  if (!file) return;

  uploading.value = docType;
  formError.value = null;

  const path = `sales-orders/${detail.value.id}/${docType}-${Date.now()}-${file.name}`;
  const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);

  if (uploadErr) {
    uploading.value = null;
    formError.value = uploadErr.message;
    return;
  }

  const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
  const { data: { user } } = await supabase.auth.getUser();

  const { error: docErr } = await supabase.from("documents").insert({
    owner_type: "SALES_ORDER",
    owner_id: detail.value.id,
    doc_type: docType,
    file_name: file.name,
    file_url: urlData.publicUrl,
    uploaded_by: user?.id,
  });

  uploading.value = null;
  if (docErr) { formError.value = docErr.message; return; }

  const { data: refreshed } = await supabase.from("documents").select("*").eq("owner_type", "SALES_ORDER").eq("owner_id", detail.value.id);
  docs.value = refreshed ?? [];
}

async function confirmOrder() {
  saving.value = true;
  formError.value = null;
  const { error: err } = await supabase.from("sales_orders").update({ status: "CONFIRMED" }).eq("id", detail.value.id);
  saving.value = false;
  if (err) { formError.value = err.message; return; }

  await supabase.from("order_status_history").insert({ sales_order_id: detail.value.id, status: "CONFIRMED" });
  detail.value.status = "CONFIRMED";
  const { data: refreshed } = await supabase.from("order_status_history").select("*").eq("sales_order_id", detail.value.id).order("changed_at");
  history.value = refreshed ?? [];
  loadOrders();
}

async function sendToEng() {
  saving.value = true;
  formError.value = null;
  const { error: err } = await supabase.from("sales_orders").update({ status: "SENT_TO_ENG" }).eq("id", detail.value.id);
  saving.value = false;
  if (err) { formError.value = err.message; return; }

  await supabase.from("order_status_history").insert({ sales_order_id: detail.value.id, status: "SENT_TO_ENG" });

  detail.value.status = "SENT_TO_ENG";
  const { data: refreshed } = await supabase.from("order_status_history").select("*").eq("sales_order_id", detail.value.id).order("changed_at");
  history.value = refreshed ?? [];
  loadOrders();
}

async function submitRequest() {
  if (!reqForm.inventory_item_id) {
    requestConfirmation.value = "Select an item first.";
    return;
  }
  requestSaving.value = true;
  requestConfirmation.value = "";
  const { error: err } = await supabase.from("procurement_requests").insert({
    inventory_item_id: reqForm.inventory_item_id,
    number_requested: reqForm.quantity,
    status: "PENDING",
    sales_order_id: detail.value.id,
    part_no: items.value[0]?.part_number || null,
    part_name: items.value[0]?.part_name || null,
    remarks: `Requested from Sales Order ${detail.value.order_no}`,
  });
  requestSaving.value = false;
  if (err) { requestConfirmation.value = "Error: " + err.message; return; }
  requestConfirmation.value = "Request sent to SCM.";
  await loadRequestedItems();
  reqForm.inventory_item_id = "";
  reqForm.quantity = 1;
}

watch(() => reqForm.category, () => { reqForm.inventory_item_id = ""; });

onMounted(() => {
  loadOrders();
  loadInventoryItems();
});
</script>

<style scoped>
.page { padding: 24px; }
.page h1 { font-size: 20px; margin: 0 0 16px; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { background: #e8edff; color: #3f51b5; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.error { color: #c62828; font-size: 13px; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; z-index: 100; overflow-y: auto; padding: 24px 0; }
.modal { background: #fff; border-radius: 10px; width: 620px; max-height: 90vh; overflow-y: auto; box-shadow: 0 12px 36px rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #eee; position: sticky; top: 0; background: #fff; z-index: 1; }
.banner { margin: 0 24px 0; padding: 12px 16px; border-radius: 6px; font-size: 13px; }
.banner.reject { background: #ffebee; color: #c62828; margin-top: 16px; }
.banner.reject strong { display: block; margin-bottom: 4px; }
.banner.reject p { margin: 0; font-size: 12px; }
.banner.approve { background: #e8f5e9; color: #2e7d32; margin-top: 16px; display: flex; justify-content: space-between; align-items: center; }
.banner-date { font-size: 11px; opacity: 0.8; }
.order-no { font-size: 17px; font-weight: 700; margin-right: 10px; }
.pill.status { background: #ede7f6; color: #5e35b1; }
.pill.cat { background: #ede7f6; color: #5e35b1; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.amber { background: #fff8e1; color: #f57f17; }
.pill.blue { background: #e3f2fd; color: #1565c0; }
.pill.grey { background: #eee; color: #777; }
.requested-table { margin-top: 12px; }
.icon-btn { border: none; background: none; font-size: 16px; cursor: pointer; color: #888; }
.info-block { padding: 18px 24px; border-bottom: 1px solid #f2f2f2; }
.info-block:last-of-type { border-bottom: none; }
.info-block h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin: 0 0 12px; font-weight: 700; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.info-grid .k { display: block; font-size: 11px; color: #999; }
.info-grid .v { display: block; font-size: 14px; color: #222; font-weight: 500; }
.inner-table th, .inner-table td { font-size: 12px; }
.doc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.doc-grid.single { grid-template-columns: 1fr; max-width: 320px; }
.doc-note { font-size: 11px; color: #999; margin-top: 10px; }
.doc-card-multi {
  padding: 14px;
  border: 1.5px solid #e2e2e2;
  border-radius: 8px;
  background: #fafbfd;
}
.doc-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.doc-icon { font-size: 18px; flex-shrink: 0; }
.doc-title { font-size: 12px; font-weight: 700; color: #333; flex: 1; }
.doc-empty-text { font-size: 12px; color: #aaa; margin: 0; }
.doc-file-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.doc-file-list li { display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
.doc-file-list a { color: #3f51b5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%; }
.doc-meta { font-size: 10px; color: #999; flex-shrink: 0; }
.doc-action {
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #c5cae9;
  color: #3f51b5;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.doc-action:hover { background: #eef0ff; }
.request-row { display: flex; gap: 8px; align-items: center; }
.secondary { background: #eee; color: #333; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; white-space: nowrap; }
.pill.handler { background: #fff3e0; color: #e65100; }
.confirm { color: #2e7d32; font-size: 12px; margin-top: 8px; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.primary:disabled { opacity: 0.6; cursor: not-allowed; }
.modal-footer { padding: 18px 24px; display: flex; justify-content: flex-end; }
.modal .error { padding: 0 24px 18px; }
</style>