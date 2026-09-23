<template>
  <div class="page">
    <div class="page-header">
      <h1>Machine List</h1>
      <button class="primary" @click="showCreate = !showCreate">
        {{ showCreate ? "Cancel" : "Add Machine" }}
      </button>
    </div>

    <form v-if="showCreate" class="card form-grid" @submit.prevent="createMachine">
      <div><label>Machine Code</label><input v-model="form.machine_code" required /></div>
      <div><label>Name</label><input v-model="form.name" required /></div>
      <div><label>Type</label><input v-model="form.type" placeholder="e.g. CNC Lathe" /></div>
      <div><label>Status</label>
        <select v-model="form.status">
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="span-2"><label>Description</label><input v-model="form.description" /></div>
      <div class="span-2">
        <button class="primary" type="submit" :disabled="saving">{{ saving ? "Saving…" : "Save" }}</button>
      </div>
      <p v-if="formError" class="error span-2">{{ formError }}</p>
    </form>

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <table v-else>
        <thead><tr><th>Name</th><th>Type</th><th>Current Process</th><th>Current Job</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="m in machines" :key="m.id">
            <td>{{ m.name }}</td>
            <td>{{ m.type || "-" }}</td>
            <td>{{ m.current_process || "-" }}</td>
            <td>{{ m.current_job || "-" }}</td>
            <td><span class="pill" :class="statusClass(m.status)">{{ m.status }}</span></td>
            <td>
              <a href="#" @click.prevent="openStatusUpdate(m)">Update Status</a> ·
              <a href="#" @click.prevent="openHistory(m)">History</a>
            </td>
          </tr>
          <tr v-if="machines.length === 0"><td colspan="6" class="empty">No machines yet.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- UPDATE STATUS MODAL -->
    <div v-if="statusTarget" class="modal-backdrop" @click.self="statusTarget = null">
      <div class="modal">
        <h2>Update Status — {{ statusTarget.name }}</h2>
        <label>New Status</label>
        <select v-model="statusForm.new_status">
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
        <label>Reason</label>
        <input v-model="statusForm.reason" placeholder="e.g. Scheduled maintenance" />
        <label>Remarks</label>
        <textarea v-model="statusForm.remarks" rows="3"></textarea>
        <div class="modal-actions">
          <button @click="statusTarget = null">Cancel</button>
          <button class="primary" @click="saveStatusUpdate" :disabled="saving">{{ saving ? "Saving…" : "Save" }}</button>
        </div>
        <p v-if="formError" class="error">{{ formError }}</p>
      </div>
    </div>

    <!-- STATUS HISTORY MODAL -->
    <div v-if="historyTarget" class="modal-backdrop" @click.self="historyTarget = null">
      <div class="modal">
        <h2>Status History — {{ historyTarget.name }}</h2>
        <table class="steps">
          <thead><tr><th>Date</th><th>From</th><th>To</th><th>Reason</th></tr></thead>
          <tbody>
            <tr v-for="h in history" :key="h.id">
              <td>{{ new Date(h.changed_at).toLocaleString() }}</td>
              <td>{{ h.previous_status || "-" }}</td>
              <td>{{ h.new_status }}</td>
              <td>{{ h.reason || "-" }}</td>
            </tr>
            <tr v-if="history.length === 0"><td colspan="4" class="empty">No status changes recorded.</td></tr>
          </tbody>
        </table>
        <button @click="historyTarget = null">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const machines = ref([]);
const loading = ref(true);
const error = ref(null);
const showCreate = ref(false);
const saving = ref(false);
const formError = ref(null);
const statuses = ["AVAILABLE", "RUNNING", "SETUP", "MAINTENANCE"];
const form = reactive({ machine_code: "", name: "", type: "", status: "AVAILABLE", description: "" });

const statusTarget = ref(null);
const statusForm = reactive({ new_status: "AVAILABLE", reason: "", remarks: "" });

const historyTarget = ref(null);
const history = ref([]);

function statusClass(s) {
  if (s === "AVAILABLE") return "green";
  if (s === "RUNNING") return "blue";
  if (s === "SETUP") return "amber";
  return "red";
}

async function loadMachines() {
  loading.value = true;
  const { data, error: err } = await supabase.from("machines").select("*").order("name");
  if (err) error.value = err.message;
  else machines.value = data;
  loading.value = false;
}

async function createMachine() {
  saving.value = true;
  formError.value = null;
  const { error: err } = await supabase.from("machines").insert({ ...form });
  saving.value = false;
  if (err) { formError.value = err.message; return; }
  showCreate.value = false;
  Object.assign(form, { machine_code: "", name: "", type: "", status: "AVAILABLE", description: "" });
  loadMachines();
}

function openStatusUpdate(m) {
  statusTarget.value = m;
  formError.value = null;
  Object.assign(statusForm, { new_status: m.status, reason: "", remarks: "" });
}

async function saveStatusUpdate() {
  saving.value = true;
  formError.value = null;
  const { data: { user } } = await supabase.auth.getUser();

  const { error: histErr } = await supabase.from("machine_status_history").insert({
    machine_id: statusTarget.value.id,
    previous_status: statusTarget.value.status,
    new_status: statusForm.new_status,
    reason: statusForm.reason || null,
    remarks: statusForm.remarks || null,
    changed_by: user?.id || null,
  });
  if (histErr) { saving.value = false; formError.value = histErr.message; return; }

  const { error: updErr } = await supabase.from("machines").update({ status: statusForm.new_status }).eq("id", statusTarget.value.id);
  saving.value = false;
  if (updErr) { formError.value = updErr.message; return; }

  statusTarget.value = null;
  loadMachines();
}

async function openHistory(m) {
  historyTarget.value = m;
  const { data } = await supabase.from("machine_status_history").select("*").eq("machine_id", m.id).order("changed_at", { ascending: false });
  history.value = data ?? [];
}

onMounted(loadMachines);
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h1 { font-size: 20px; margin: 0; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; margin-top: 8px; }
input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.blue { background: #e3f2fd; color: #1565c0; }
.pill.amber { background: #fff8e1; color: #f57f17; }
.pill.red { background: #ffebee; color: #c62828; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.primary:disabled { opacity: 0.6; cursor: not-allowed; }
.error { color: #c62828; font-size: 13px; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; padding: 24px; border-radius: 8px; width: 420px; max-height: 85vh; overflow-y: auto; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.steps th, .steps td { font-size: 12px; }
</style>