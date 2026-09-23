<template>
  <div class="page">
    <h1>In-Process (IPQC)</h1>

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <table v-else>
        <thead><tr><th>Machine</th><th>Order No</th><th>Part Name</th><th>Process</th><th>Operator</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="i in items" :key="i.id">
            <td>{{ i.machines?.name || i.machine_code || "-" }}</td>
            <td>{{ i.order_no || "-" }}</td>
            <td>{{ i.part_name }}</td>
            <td>{{ i.process_name || "-" }}</td>
            <td>{{ i.user_profiles?.full_name || "-" }}</td>
            <td><span class="pill" :class="statusClass(i.status)">{{ i.status }}</span></td>
            <td><a href="#" @click.prevent="openForm(i)">Inspect</a></td>
          </tr>
          <tr v-if="items.length === 0"><td colspan="7" class="empty">No in-process items pending inspection.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="selected" class="modal-backdrop" @click.self="selected = null">
      <div class="modal">
        <h2>IPQC Inspection — {{ selected.part_name }}</h2>
        <p class="sub">Process: {{ selected.process_name }} · Qty: {{ selected.quantity }}</p>

        <label>Quantity Accepted</label>
        <input v-model.number="form.qty_accepted" type="number" />
        <label>Quantity Rejected</label>
        <input v-model.number="form.qty_rejected" type="number" />
        <label>Remarks</label>
        <textarea v-model="form.remarks" rows="3"></textarea>
        <label>Result</label>
        <select v-model="form.status">
          <option value="PASS_CHECK">Pass</option>
          <option value="FAIL">Fail</option>
          <option value="REINSPECT">Re-inspect</option>
        </select>

        <div class="modal-actions">
          <button @click="selected = null">Cancel</button>
          <button class="primary" @click="submitInspection" :disabled="saving">
            {{ saving ? "Saving…" : "Submit Inspection" }}
          </button>
        </div>
        <p v-if="formError" class="error">{{ formError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const items = ref([]);
const loading = ref(true);
const selected = ref(null);
const saving = ref(false);
const formError = ref(null);
const form = reactive({ qty_accepted: null, qty_rejected: null, remarks: "", status: "PASS_CHECK" });

function statusClass(s) {
  if (s === "PASS_CHECK" || s === "COMPLETED") return "green";
  if (s === "FAIL") return "red";
  if (s === "REINSPECT") return "amber";
  return "grey";
}

async function loadItems() {
  loading.value = true;
  const { data } = await supabase
    .from("ipqc_inspections")
    .select("*, machines(name), user_profiles(full_name)")
    .in("status", ["PENDING", "PENDING_INSPECTION", "REINSPECT"])
    .order("created_at", { ascending: false });
  items.value = data ?? [];
  loading.value = false;
}

function openForm(i) {
  selected.value = i;
  formError.value = null;
  Object.assign(form, { qty_accepted: i.qty_accepted ?? i.quantity, qty_rejected: i.qty_rejected ?? 0, remarks: i.remarks || "", status: "PASS_CHECK" });
}

async function submitInspection() {
  if (!validInspectionQuantities()) return;
  saving.value = true;
  formError.value = null;
  const { data: { user } } = await supabase.auth.getUser();
  const { data: updated, error: err } = await supabase.from("ipqc_inspections").update({
    qty_accepted: form.qty_accepted, qty_rejected: form.qty_rejected,
    remarks: form.remarks, status: form.status, inspected_by: user?.id,
  }).eq("id", selected.value.id).select("id").maybeSingle();
  saving.value = false;
  if (err || !updated) { formError.value = err?.message || "The inspection was not updated. Refresh and try again."; return; }
  selected.value = null;
  loadItems();
}

function validInspectionQuantities() {
  const accepted = form.qty_accepted;
  const rejected = form.qty_rejected;
  const total = Number(selected.value?.quantity);
  if (!Number.isInteger(accepted) || !Number.isInteger(rejected) || accepted < 0 || rejected < 0 ||
      accepted + rejected !== total) {
    formError.value = "Accepted and rejected quantities must be whole numbers that add up to the inspected quantity.";
    return false;
  }
  return true;
}

onMounted(loadItems);
</script>

<style scoped>
.page { padding: 24px; }
.page h1 { font-size: 20px; margin: 0 0 16px; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.red { background: #ffebee; color: #c62828; }
.pill.amber { background: #fff8e1; color: #f57f17; }
.pill.grey { background: #eee; color: #777; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; padding: 24px; border-radius: 8px; width: 380px; }
.sub { color: #888; font-size: 12px; margin: 0 0 12px; }
label { display: block; font-size: 12px; color: #666; margin-top: 8px; margin-bottom: 4px; }
input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.error { color: #c62828; font-size: 13px; margin-top: 8px; }
</style>
