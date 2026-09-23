<template>
  <div class="page">
    <h1>System Log</h1>
    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <table v-else>
        <thead><tr><th>Date & Time</th><th>User</th><th>Action</th><th>Module</th></tr></thead>
        <tbody>
          <tr v-for="l in logs" :key="l.id">
            <td>{{ new Date(l.occurred_at).toLocaleString() }}</td>
            <td>{{ l.user_profiles?.full_name || "System" }}</td>
            <td>{{ l.action }}</td>
            <td>{{ l.module }}</td>
          </tr>
          <tr v-if="logs.length === 0"><td colspan="4" class="empty">No activity recorded yet.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const logs = ref([]);
const loading = ref(true);
const error = ref(null);

async function load() {
  loading.value = true;
  const { data, error: err } = await supabase
    .from("system_log")
    .select("*, user_profiles(full_name)")
    .order("occurred_at", { ascending: false })
    .limit(200);
  if (err) error.value = err.message;
  else logs.value = data;
  loading.value = false;
}
onMounted(load);
</script>

<style scoped>
.page { padding: 24px; }
.page h1 { font-size: 20px; margin: 0 0 16px; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.error { color: #c62828; font-size: 13px; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
</style>