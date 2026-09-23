<template>
  <div class="page">
    <div class="page-header">
      <h1>Procurement</h1>
      <select v-model="categoryFilter">
        <option value="ALL">All Categories</option>
        <option value="RAW_MATERIAL">Raw Material</option>
        <option value="TOOLING">Tooling</option>
        <option value="GAUGE">Gauge</option>
      </select>
    </div>

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <table v-else>
        <thead>
          <tr>
            <th>Request Date</th><th>Category</th><th>Item</th><th>Supplier</th>
            <th>Required Qty</th><th>Est. Arrival</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filtered" :key="r.id">
            <td>{{ r.request_date }}</td>
            <td><span class="pill cat">{{ categoryLabel(r.inventory_items?.category) }}</span></td>
            <td>{{ r.inventory_items?.item_name }}</td>
            <td>{{ r.partners?.name || "-" }}</td>
            <td>{{ r.number_requested }}</td>
            <td>{{ r.expected_arrival ? new Date(r.expected_arrival).toLocaleDateString() : "-" }}</td>
            <td><span class="pill" :class="statusClass(r.status)">{{ statusLabel(r.status) }}</span></td>
            <td><a href="#" @click.prevent="openUpdate(r)">Update</a></td>
          </tr>
          <tr v-if="filtered.length === 0"><td colspan="8" class="empty">No procurement requests.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- UPDATE MODAL: set supplier / arrival date / advance status -->
    <div v-if="editing" class="modal-backdrop" @click.self="editing = null">
      <div class="modal">
        <h2>{{ editing.inventory_items?.item_name }}</h2>
        <label>Supplier</label>
        <select v-model="editForm.supplier_partner_id">
          <option value="">-</option>
          <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <label>Estimated Arrival</label>
        <input v-model="editForm.expected_arrival" type="date" />
        <label>Status</label>
        <select v-model="editForm.status">
          <option value="PENDING">Pending</option>
          <option value="PREPARED">Prepared</option>
          <option value="IN_PROGRESS">Under Procurement</option>
          <option value="DONE">Done</option>
        </select>
        <div class="modal-actions">
          <button @click="editing = null">Cancel</button>
          <button class="primary" @click="saveUpdate" :disabled="saving">{{ saving ? "Saving…" : "Save" }}</button>
        </div>
        <p v-if="formError" class="error">{{ formError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const requests = ref([]);
const suppliers = ref([]);
const loading = ref(true);
const categoryFilter = ref("ALL");

const editing = ref(null);
const saving = ref(false);
const formError = ref(null);
const editForm = reactive({ supplier_partner_id: "", expected_arrival: "", status: "PREPARED" });

const filtered = computed(() =>
  categoryFilter.value === "ALL"
    ? requests.value
    : requests.value.filter((r) => r.inventory_items?.category === categoryFilter.value)
);

function categoryLabel(c) {
  if (c === "RAW_MATERIAL") return "Raw Material";
  if (c === "TOOLING") return "Tooling";
  if (c === "GAUGE") return "Gauge";
  return c || "-";
}
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

async function loadRequests() {
  loading.value = true;
  const { data } = await supabase
    .from("procurement_requests")
    .select("*, inventory_items(item_name, category), partners(name)")
    .order("request_date", { ascending: false });
  requests.value = data ?? [];
  loading.value = false;
}

async function loadSuppliers() {
  const { data } = await supabase.from("partners").select("id, name").eq("partner_type", "SUPPLIER").eq("status", "ACTIVE");
  suppliers.value = data ?? [];
}

function openUpdate(r) {
  editing.value = r;
  formError.value = null;
  Object.assign(editForm, {
    supplier_partner_id: r.supplier_partner_id || "",
    expected_arrival: r.expected_arrival ? r.expected_arrival.slice(0, 10) : "",
    status: r.status,
  });
}

async function saveUpdate() {
  saving.value = true;
  formError.value = null;
  const { error: err } = await supabase.from("procurement_requests").update({
    supplier_partner_id: editForm.supplier_partner_id || null,
    expected_arrival: editForm.expected_arrival || null,
    status: editForm.status,
  }).eq("id", editing.value.id);
  saving.value = false;
  if (err) { formError.value = err.message; return; }
  editing.value = null;
  loadRequests();
}

onMounted(() => { loadRequests(); loadSuppliers(); });
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h1 { font-size: 20px; margin: 0; }
.page-header select { padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.pill.cat { background: #ede7f6; color: #5e35b1; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.amber { background: #fff8e1; color: #f57f17; }
.pill.blue { background: #e3f2fd; color: #1565c0; }
.pill.grey { background: #eee; color: #777; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; padding: 24px; border-radius: 8px; width: 360px; display: flex; flex-direction: column; gap: 4px; }
label { font-size: 12px; color: #666; margin-top: 8px; }
input, select { padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.error { color: #c62828; font-size: 13px; margin-top: 8px; }
</style>