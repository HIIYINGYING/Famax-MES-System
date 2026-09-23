<template>
  <div class="dashboard">
    <h1>Engineering Dashboard</h1>
    <p class =subtitle>Order approvals and development activity</p>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else>
      <div class="stat-cards">
        <div class="card" :class="{ alert: stats.pendingApproval > 0 }"><span class="label">PENDING APPROVAL</span><span class="value">{{ stats.pendingApproval }}</span></div>
        <div class="card"><span class="label">IN DEVELOPMENT</span><span class="value">{{ stats.development }}</span></div>
        <div class="card"><span class="label">FINAL REVIEW</span><span class="value">{{ stats.finalReview }}</span></div>
        <div class="card"><span class="label">SENT TO PP</span><span class="value">{{ stats.sentToPP }}</span></div>
      </div>

      <div class="section">
        <h2>Pending Engineering Approval</h2>
        <table>
          <thead><tr><th>Order No</th><th>Customer</th><th>Order Date</th><th>Due Date</th><th></th></tr></thead>
          <tbody>
            <tr v-for="o in pendingOrders" :key="o.id">
              <td>{{ o.order_no }}</td>
              <td>{{ o.customers?.customer_name }}</td>
              <td>{{ o.order_date }}</td>
              <td>{{ o.due_date || "-" }}</td>
              <td><a href="#" @click.prevent="openReview(o)">Review</a></td>
            </tr>
            <tr v-if="pendingOrders.length === 0"><td colspan="5" class="empty">No orders awaiting approval.</td></tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- REVIEW MODAL -->
    <div v-if="reviewing" class="modal-backdrop" @click.self="closeReview">
      <div class="modal">
        <header class="modal-header">
          <span class="order-no">{{ reviewing.order_no }}</span>
          <button class="icon-btn" @click="closeReview">✕</button>
        </header>

        <section class="info-block">
          <div class="info-grid">
            <div><span class="k">Customer</span><span class="v">{{ reviewing.customers?.customer_name }}</span></div>
            <div><span class="k">Order Date</span><span class="v">{{ reviewing.order_date }}</span></div>
            <div><span class="k">Due Date</span><span class="v">{{ reviewing.due_date || "-" }}</span></div>
            <div><span class="k">Remarks</span><span class="v">{{ reviewing.remarks || "-" }}</span></div>
          </div>
        </section>

        <section class="info-block">
          <h3>Submitted by Business Development</h3>
          <table class="inner-table">
            <thead><tr><th>Part Number</th><th>Part Name</th><th>Quantity</th><th>Remarks</th></tr></thead>
            <tbody>
              <tr v-for="item in reviewItems" :key="item.id">
                <td>{{ item.part_number }}</td>
                <td>{{ item.part_name }}</td>
                <td>{{ item.quantity }}</td>
                <td>{{ item.remarks || "-" }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="info-block">
          <h3>Customer Drawing</h3>
          <ul v-if="reviewDocs.length" class="doc-file-list">
            <li v-for="d in reviewDocs" :key="d.id"><a :href="d.file_url" target="_blank">{{ d.file_name }}</a></li>
          </ul>
          <p v-else class="doc-empty-text">No drawing uploaded yet.</p>
        </section>

        <section class="info-block">
          <label>Remarks (required if rejecting)</label>
          <textarea v-model="decisionRemarks" rows="2" placeholder="e.g. Missing tolerance spec on part MSDIE705A"></textarea>
        </section>

        <footer class="modal-footer">
          <button class="danger" @click="rejectOrder" :disabled="saving">Reject</button>
          <button class="primary" @click="approveOrder" :disabled="saving">
            {{ saving ? "Processing…" : "Approve — Move to Development" }}
          </button>
        </footer>
        <p v-if="formError" class="error">{{ formError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: "EngineeringDashboard" });
import { reactive, ref, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const loading = ref(true);
const error = ref(null);
const pendingOrders = ref([]);
const stats = reactive({ pendingApproval: 0, development: 0, finalReview: 0, sentToPP: 0 });

const reviewing = ref(null);
const reviewItems = ref([]);
const reviewDocs = ref([]);
const decisionRemarks = ref("");
const saving = ref(false);
const formError = ref(null);

async function loadDashboard() {
  loading.value = true;
  try {
    const [pending, dev, finalReview, sentToPP, pendingList] = await Promise.all([
      supabase.from("sales_orders").select("id", { count: "exact", head: true }).eq("status", "SENT_TO_ENG"),
      supabase.from("manufacturing_orders").select("id", { count: "exact", head: true }).eq("status", "DEVELOPMENT"),
      supabase.from("manufacturing_orders").select("id", { count: "exact", head: true }).eq("status", "FINAL_REVIEW"),
      supabase.from("manufacturing_orders").select("id", { count: "exact", head: true }).eq("status", "SENT_TO_PP"),
      supabase.from("sales_orders").select("*, customers(customer_name)").eq("status", "SENT_TO_ENG").order("order_date"),
    ]);
    stats.pendingApproval = pending.count ?? 0;
    stats.development = dev.count ?? 0;
    stats.finalReview = finalReview.count ?? 0;
    stats.sentToPP = sentToPP.count ?? 0;
    pendingOrders.value = pendingList.data ?? [];
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function openReview(order) {
  reviewing.value = order;
  decisionRemarks.value = "";
  formError.value = null;
  const [itemsRes, docsRes] = await Promise.all([
    supabase.from("sales_order_items").select("*").eq("sales_order_id", order.id),
    supabase.from("documents").select("*").eq("owner_type", "SALES_ORDER").eq("owner_id", order.id).eq("doc_type", "CUSTOMER_DRAWING"),
  ]);
  reviewItems.value = itemsRes.data ?? [];
  reviewDocs.value = docsRes.data ?? [];
}

function closeReview() {
  reviewing.value = null;
}

async function notifyRole(role, message) {
  const { data: users } = await supabase.from("user_profiles").select("id").eq("role", role).eq("account_status", "ACTIVE");
  if (users?.length) {
    await supabase.from("notifications").insert(users.map((u) => ({ profile_id: u.id, message })));
  }
}

async function approveOrder() {
  saving.value = true;
  formError.value = null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!reviewItems.value.length) {
    formError.value = "This sales order has no line items and cannot be approved.";
    saving.value = false;
    return;
  }

  const { data: existingMOs, error: lookupError } = await supabase
    .from("manufacturing_orders")
    .select("sales_order_item_id")
    .eq("sales_order_id", reviewing.value.id);
  if (lookupError) {
    formError.value = `Could not check existing manufacturing orders: ${lookupError.message}`;
    saving.value = false;
    return;
  }

  const existingItemIds = new Set((existingMOs ?? []).map((mo) => mo.sales_order_item_id));
  for (const item of reviewItems.value) {
    if (existingItemIds.has(item.id)) continue;
    const moNo = `MO-${reviewing.value.order_no.replace(/^SO-/, "")}-${item.part_number}-${item.id.slice(0, 8)}`;
    const { error: moError } = await supabase.from("manufacturing_orders").insert({
      mo_no: moNo,
      sales_order_id: reviewing.value.id,
      sales_order_item_id: item.id,
      part_number: item.part_number,
      part_name: item.part_name,
      quantity: item.quantity,
      status: "DEVELOPMENT",
    });
    if (moError) {
      formError.value = `Manufacturing orders were only partly created. Retry approval to continue safely. ${moError.message}`;
      saving.value = false;
      return;
    }
  }

  const { data: updatedOrder, error: orderErr } = await supabase.from("sales_orders").update({
    status: "IN_PROGRESS", reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
  }).eq("id", reviewing.value.id).eq("status", "SENT_TO_ENG").select("id").maybeSingle();
  if (orderErr || !updatedOrder) {
    formError.value = orderErr?.message || "This order has already been reviewed. Refresh the dashboard.";
    saving.value = false;
    return;
  }

  const { error: historyError } = await supabase.from("order_status_history").insert({
    sales_order_id: reviewing.value.id, status: "IN_PROGRESS",
    note: "Approved by Engineering" + (decisionRemarks.value ? `: ${decisionRemarks.value}` : ""),
  });

  saving.value = false;
  if (historyError) {
    formError.value = `Order and manufacturing orders were approved, but the status history could not be saved: ${historyError.message}`;
  } else {
    reviewing.value = null;
  }
  await loadDashboard();
}

async function rejectOrder() {
  if (!decisionRemarks.value.trim()) {
    formError.value = "Please provide a reason for rejection.";
    return;
  }
  saving.value = true;
  formError.value = null;
  const { data: { user } } = await supabase.auth.getUser();

  const { error: err } = await supabase.from("sales_orders").update({
    status: "REJECTED", rejection_reason: decisionRemarks.value,
    reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
  }).eq("id", reviewing.value.id);
  saving.value = false;
  if (err) { formError.value = err.message; return; }

  await supabase.from("order_status_history").insert({
    sales_order_id: reviewing.value.id, status: "REJECTED", note: decisionRemarks.value,
  });
  await notifyRole("BD", `Order ${reviewing.value.order_no} was rejected by Engineering: ${decisionRemarks.value}`);

  reviewing.value = null;
  loadDashboard();
}

onMounted(loadDashboard);
</script>

<style scoped>
.dashboard { padding: 24px; }
h1 {margin: 0 0 4px; font-size: 20px;}
.subtitle {margin: 0 0 24px;color: #777;font-size: 13px;}
.stat-cards { display: grid; grid-template-columns: repeat(4, minmax(140px, 1fr)); gap: 16px; margin-bottom: 16px; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.card.alert { border-color: #e53935; background: #fff5f5; }
.label { font-size: 11px; font-weight: 600; color: #666; letter-spacing: 0.5px; }
.value { font-size: 28px; font-weight: 700; }
.card.alert .value { color: #c62828; }
.section { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 20px; }
.section h2 { margin: 0 0 12px; font-size: 14px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.loading, .error, .empty { padding: 16px 0; font-size: 13px; color: #777; text-align: center; }
.error { color: #c62828; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; overflow-y: auto; padding: 24px 0; }
.modal { background: #fff; border-radius: 10px; width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 12px 36px rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #eee; }
.order-no { font-size: 16px; font-weight: 700; }
.icon-btn { border: none; background: none; font-size: 16px; cursor: pointer; color: #888; }
.info-block { padding: 16px 24px; border-bottom: 1px solid #f2f2f2; }
.info-block:last-of-type { border-bottom: none; }
.info-block h3 { font-size: 12px; text-transform: uppercase; color: #888; margin: 0 0 10px; font-weight: 700; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.info-grid .k { display: block; font-size: 11px; color: #999; }
.info-grid .v { display: block; font-size: 14px; font-weight: 500; }
.inner-table th, .inner-table td { font-size: 12px; }
.doc-file-list { list-style: none; margin: 0; padding: 0; font-size: 12px; }
.doc-file-list a { color: #3f51b5; }
.doc-empty-text { font-size: 12px; color: #aaa; }
label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
.modal-footer { padding: 16px 24px; display: flex; justify-content: flex-end; gap: 10px; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 18px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.danger { background: #fff; color: #c62828; border: 1px solid #ef9a9a; padding: 8px 18px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.primary:disabled, .danger:disabled { opacity: 0.6; cursor: not-allowed; }
.modal .error { padding: 0 24px 16px; color: #c62828; font-size: 13px; }
</style>
