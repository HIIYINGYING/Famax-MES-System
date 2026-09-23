<template>
  <div class="page">
    <div class="page-header">
      <h1>Machine Report</h1>
      <button class="primary" @click="showCreate = !showCreate">
        {{ showCreate ? "Cancel" : "Report Issue" }}
      </button>
    </div>

    <form v-if="showCreate" class="card form-grid" @submit.prevent="createReport">
      <div>
        <label>Machine</label>
        <select v-model="form.machine_id" required>
          <option disabled value="">Select…</option>
          <option v-for="m in machines" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>
      <div>
        <label>Issue Type</label>
        <select v-model="form.reason" required>
          <option>Breakdown</option><option>Maintenance</option><option>Setup Delay</option><option>Other</option>
        </select>
      </div>
      <div class="span-2"><label>Description</label><input v-model="form.note" /></div>
      <div class="span-2">
        <button class="primary" type="submit" :disabled="saving">{{ saving ? "Saving…" : "Submit Report" }}</button>
      </div>
      <p v-if="formError" class="error span-2">{{ formError }}</p>
    </form>

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <table v-else>
        <thead><tr><th>Machine</th><th>Issue Type</th><th>Description</th><th>Reported</th><th>Status</th></tr></thead>
        <tbody>
          <tr v-for="r in reports" :key="r.id">
            <td>{{ r.machines?.name }}</td>
            <td>{{ r.reason }}</td>
            <td>{{ r.note || "-" }}</td>
            <td>{{ new Date(r.created_at).toLocaleString() }}</td>
            <td><span class="pill">{{ r.status }}</span></td>
          </tr>
          <tr v-if="reports.length === 0"><td colspan="5" class="empty">No machine issues reported.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const reports = ref([]);
const machines = ref([]);
const loading = ref(true);
const showCreate = ref(false);
const saving = ref(false);
const formError = ref(null);
const form = reactive({ machine_id: "", reason: "Breakdown", note: "" });

async function load() {
  loading.value = true;
  const [reportRes, machineRes] = await Promise.all([
    supabase.from("machine_logs").select("*, machines(name)").order("created_at", { ascending: false }),
    supabase.from("machines").select("id, name").order("name"),
  ]);
  reports.value = reportRes.data ?? [];
  machines.value = machineRes.data ?? [];
  loading.value = false;
}

async function createReport() {
  saving.value = true;
  formError.value = null;
  const { error: err } = await supabase.from("machine_logs").insert({ ...form, status: "SCHEDULED" });
  saving.value = false;
  if (err) { formError.value = err.message; return; }
  showCreate.value = false;
  Object.assign(form, { machine_id: "", reason: "Breakdown", note: "" });
  load();
}

onMounted(load);
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h1 { font-size: 20px; margin: 0; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
input, select { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { background: #eee; color: #666; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.error { color: #c62828; font-size: 13px; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
</style>