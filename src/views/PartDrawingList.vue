<template>
  <div class="page">
    <h1>Document List</h1>
    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <table v-else>
        <thead><tr><th>Part No</th><th>Part Name</th><th>Revision</th><th>Customer Drawing</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="d in drawings" :key="d.id">
            <td>{{ d.part_no }}</td>
            <td>{{ d.part_name }}</td>
            <td>{{ d.revision || "-" }}</td>
            <td>
              <a v-if="d.customer_drawing_url" :href="d.customer_drawing_url" target="_blank">View file</a>
              <span v-else>-</span>
            </td>
            <td><span class="pill" :class="d.status === 'COMPLETE' ? 'green' : 'amber'">{{ d.status }}</span></td>
            <td><a href="#">View</a></td>
          </tr>
          <tr v-if="drawings.length === 0"><td colspan="6" class="empty">No documents yet.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const drawings = ref([]);
const loading = ref(true);
const error = ref(null);

async function load() {
  loading.value = true;
  const { data, error: err } = await supabase.from("part_drawings").select("*").order("part_no");
  if (err) error.value = err.message;
  else drawings.value = data;
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
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.amber { background: #fff8e1; color: #f57f17; }
.error { color: #c62828; font-size: 13px; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
</style>