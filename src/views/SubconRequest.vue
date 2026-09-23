<template>
  <div class="page">
    <div class="page-header">
      <h1>Subcon</h1>
      <button class="primary" @click="showCreate = !showCreate">
        {{ showCreate ? "Cancel" : "Request Subcon" }}
      </button>
    </div>

    <div class="tabs">
      <button :class="{ active: tab === 'active' }" @click="tab = 'active'">Active Requests</button>
      <button :class="{ active: tab === 'history' }" @click="tab = 'history'">Subcon History</button>
    </div>

    <form v-if="showCreate" class="card form-grid" @submit.prevent="createRequest">
      <div><label>Part No</label><input v-model="form.part_no" required /></div>
      <div><label>Part Name</label><input v-model="form.part_name" required /></div>
      <div><label>Required Process</label><input v-model="form.process" placeholder="e.g. Hardening" required /></div>
      <div>
        <label>Subcontractor</label>
        <select v-model="form.subcon_partner_id" required>
          <option disabled value="">Select…</option>
          <option v-for="s in subcons" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
      <div><label>Quantity</label><input v-model.number="form.quantity" type="number" required /></div>
      <div><label>Required Completion Date</label><input v-model="form.required_completion_date" type="date" /></div>
      <div class="span-2"><label>Special Requirements</label><input v-model="form.special_requirements" /></div>
      <div class="span-2">
        <button class="primary" type="submit" :disabled="saving">{{ saving ? "Saving…" : "Submit Request" }}</button>
      </div>
      <p v-if="formError" class="error span-2">{{ formError }}</p>
    </form>

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <table v-else>
        <thead>
          <tr>
            <th>Part No</th><th>Part Name</th><th>Process</th><th>Subcontractor</th>
            <th>Qty</th><th>Request Date</th><th>{{ tab === 'history' ? 'Completion Date' : 'Required By' }}</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filteredRequests" :key="r.id">
            <td>{{ r.part_no }}</td>
            <td>{{ r.part_name }}</td>
            <td>{{ r.process }}</td>
            <td>{{ r.partners?.name || "-" }}</td>
            <td>{{ r.quantity }}</td>
            <td>{{ r.created_at?.slice(0,10) }}</td>
            <td>{{ tab === 'history' ? (r.completed_date || "-") : (r.required_completion_date || "-") }}</td>
            <td><span class="pill" :class="statusClass(r.status)">{{ r.status }}</span></td>
          </tr>
          <tr v-if="filteredRequests.length === 0"><td colspan="8" class="empty">No {{ tab === 'history' ? 'completed' : 'active' }} requests.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const tab = ref("active");
const requests = ref([]);
const subcons = ref([]);
const loading = ref(true);
const showCreate = ref(false);
const saving = ref(false);
const formError = ref(null);

const form = reactive({
  part_no: "", part_name: "", process: "", subcon_partner_id: "",
  quantity: 0, required_completion_date: "", special_requirements: "",
});

const filteredRequests = computed(() =>
  tab.value === "history"
    ? requests.value.filter((r) => r.status === "COMPLETED" || r.status === "CANCELLED")
    : requests.value.filter((r) => r.status === "REQUESTED" || r.status === "IN_PROGRESS")
);

function statusClass(s) {
  if (s === "COMPLETED") return "green";
  if (s === "IN_PROGRESS") return "blue";
  if (s === "CANCELLED") return "red";
  return "grey";
}

async function loadRequests() {
  loading.value = true;
  const { data } = await supabase.from("subcon_requests").select("*, partners(name)").order("created_at", { ascending: false });
  requests.value = data ?? [];
  loading.value = false;
}

async function loadSubcons() {
  const { data } = await supabase.from("partners").select("id, name").eq("partner_type", "SUBCON").eq("status", "ACTIVE");
  subcons.value = data ?? [];
}

async function createRequest() {
  saving.value = true;
  formError.value = null;
  const { error: err } = await supabase.from("subcon_requests").insert({ ...form });
  saving.value = false;
  if (err) { formError.value = err.message; return; }
  showCreate.value = false;
  Object.assign(form, { part_no: "", part_name: "", process: "", subcon_partner_id: "", quantity: 0, required_completion_date: "", special_requirements: "" });
  loadRequests();
}

onMounted(() => { loadRequests(); loadSubcons(); });
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h1 { font-size: 20px; margin: 0; }
.tabs { display: flex; gap: 4px; margin-bottom: 12px; }
.tabs button { padding: 8px 16px; border: 1px solid #e2e2e2; background: #fff; border-radius: 4px 4px 0 0; cursor: pointer; font-size: 13px; color: #666; }
.tabs button.active { background: #3f51b5; color: #fff; border-color: #3f51b5; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
input, select { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.blue { background: #e3f2fd; color: #1565c0; }
.pill.red { background: #ffebee; color: #c62828; }
.pill.grey { background: #eee; color: #777; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.error { color: #c62828; font-size: 13px; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
</style>