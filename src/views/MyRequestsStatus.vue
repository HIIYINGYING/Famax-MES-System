<template>
  <div class="page">
    <h1>My Requests — Status</h1>

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <table v-else>
        <thead>
          <tr><th>Request Date</th><th>Category</th><th>Item</th><th>Qty Requested</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in requests" :key="r.id">
            <td>{{ r.request_date }}</td>
            <td><span class="pill cat">{{ categoryLabel(r.inventory_items?.category) }}</span></td>
            <td>{{ r.inventory_items?.item_name }}</td>
            <td>{{ r.number_requested }}</td>
            <td><span class="pill" :class="statusClass(r.status)">{{ statusLabel(r.status) }}</span></td>
          </tr>
          <tr v-if="requests.length === 0"><td colspan="5" class="empty">You haven't requested any materials, tooling, or gauges yet.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const requests = ref([]);
const loading = ref(true);

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

async function load() {
  loading.value = true;
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("procurement_requests")
    .select("*, inventory_items(item_name, category)")
    .eq("requested_by", user?.id)
    .order("request_date", { ascending: false });
  requests.value = data ?? [];
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
.pill.cat { background: #ede7f6; color: #5e35b1; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.amber { background: #fff8e1; color: #f57f17; }
.pill.blue { background: #e3f2fd; color: #1565c0; }
.pill.grey { background: #eee; color: #777; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
</style>