<template>
  <div class="page">
    <h1>Manufacturing Order (MO)</h1>

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="error" class="error">{{ error }}</div>

      <table v-else>
        <thead>
          <tr>
            <th>Order No</th>
            <th>Part No</th>
            <th>Part Name</th>
            <th>Quantity</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="mo in mos" :key="mo.id">
            <td>{{ mo.mo_no }}</td>
            <td>{{ mo.part_number }}</td>
            <td>{{ mo.part_name }}</td>
            <td>{{ mo.quantity }} PCS</td>
            <td><span class="pill" :class="mo.status.toLowerCase()">{{ mo.status }}</span></td>
            <td><a href="#" @click.prevent="openEdit(mo)">Update</a></td>
          </tr>
          <tr v-if="mos.length === 0">
            <td colspan="6" class="empty">No manufacturing orders yet.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="editing" class="modal-backdrop" @click.self="editing = null">
      <div class="modal">
        <h2>{{ editing.mo_no }}</h2>
        <label>Status</label>
        <select v-model="editing.status">
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
        <label>Remarks</label>
        <textarea v-model="editing.remarks" rows="3"></textarea>
        <div class="modal-actions">
          <button @click="editing = null">Cancel</button>
          <button class="primary" @click="saveEdit" :disabled="saving">
            {{ saving ? "Saving…" : "Save" }}
          </button>
        </div>
        <p v-if="formError" class="error">{{ formError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const mos = ref([]);
const loading = ref(true);
const error = ref(null);
const editing = ref(null);
const saving = ref(false);
const formError = ref(null);
const statuses = ["DEVELOPMENT", "PENDING_APPROVAL", "IN_PROGRESS", "PRODUCTION", "COMPLETED"];

async function loadMOs() {
  loading.value = true;
  const { data, error: err } = await supabase
    .from("manufacturing_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (err) error.value = err.message;
  else mos.value = data;
  loading.value = false;
}

function openEdit(mo) {
  editing.value = { ...mo };
  formError.value = null;
}

async function saveEdit() {
  saving.value = true;
  const { error: err } = await supabase
    .from("manufacturing_orders")
    .update({ status: editing.value.status, remarks: editing.value.remarks })
    .eq("id", editing.value.id);
  saving.value = false;
  if (err) {
    formError.value = err.message;
    return;
  }
  editing.value = null;
  loadMOs();
}

onMounted(loadMOs);
</script>

<style scoped>
.page { padding: 24px; }
.page h1 { font-size: 20px; margin: 0 0 16px; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: #eee; color: #666; }
.pill.production, .pill.completed { background: #e8f5e9; color: #2e7d32; }
.pill.in_progress { background: #fff8e1; color: #f57f17; }
.error { color: #c62828; font-size: 13px; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; padding: 24px; border-radius: 8px; width: 360px; display: flex; flex-direction: column; gap: 8px; }
.modal label { font-size: 12px; color: #666; }
.modal select, .modal textarea { padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
</style>