<template>
  <div class="page">
    <h1>Overall Inspection History</h1>

    <div class="filters">
      <select v-model="typeFilter">
        <option value="ALL">All Types</option>
        <option value="IQC">IQC</option>
        <option value="IPQC">IPQC</option>
        <option value="OQC">OQC</option>
      </select>
      <input v-model="search" placeholder="Search part / item…" />
    </div>

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <table v-else>
        <thead><tr><th>Type</th><th>Date</th><th>Item / Part</th><th>Qty</th><th>Accepted</th><th>Rejected</th><th>Result</th></tr></thead>
        <tbody>
          <tr v-for="r in filteredRecords" :key="r.type + r.id">
            <td><span class="pill type">{{ r.type }}</span></td>
            <td>{{ r.date }}</td>
            <td>{{ r.label }}</td>
            <td>{{ r.quantity }}</td>
            <td>{{ r.qty_accepted ?? "-" }}</td>
            <td>{{ r.qty_rejected ?? "-" }}</td>
            <td><span class="pill" :class="statusClass(r.status)">{{ r.status }}</span></td>
          </tr>
          <tr v-if="filteredRecords.length === 0"><td colspan="7" class="empty">No inspection records match.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const typeFilter = ref("ALL");
const search = ref("");
const loading = ref(true);
const records = ref([]);

function statusClass(s) {
  if (s === "PASS_CHECK" || s === "COMPLETED") return "green";
  if (s === "FAIL") return "red";
  if (s === "REINSPECT") return "amber";
  return "grey";
}

const filteredRecords = computed(() => {
  let list = records.value;
  if (typeFilter.value !== "ALL") list = list.filter((r) => r.type === typeFilter.value);
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter((r) => r.label.toLowerCase().includes(q));
  }
  return list;
});

async function loadAll() {
  loading.value = true;
  const [iqc, ipqc, oqc] = await Promise.all([
    supabase.from("iqc_inspections").select("*"),
    supabase.from("ipqc_inspections").select("*"),
    supabase.from("oqc_inspections").select("*"),
  ]);

  const iqcRows = (iqc.data ?? []).map((r) => ({ type: "IQC", id: r.id, date: r.inspection_date, label: r.item, quantity: r.quantity, qty_accepted: r.qty_accepted, qty_rejected: r.qty_rejected, status: r.status }));
  const ipqcRows = (ipqc.data ?? []).map((r) => ({ type: "IPQC", id: r.id, date: r.created_at?.slice(0, 10), label: r.part_name, quantity: r.quantity, qty_accepted: r.qty_accepted, qty_rejected: r.qty_rejected, status: r.status }));
  const oqcRows = (oqc.data ?? []).map((r) => ({ type: "OQC", id: r.id, date: r.inspection_date, label: r.item, quantity: r.quantity, qty_accepted: r.qty_accepted, qty_rejected: r.qty_rejected, status: r.status }));

  records.value = [...iqcRows, ...ipqcRows, ...oqcRows].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  loading.value = false;
}

onMounted(loadAll);
</script>

<style scoped>
.page { padding: 24px; }
.page h1 { font-size: 20px; margin: 0 0 16px; }
.filters { display: flex; gap: 8px; margin-bottom: 12px; }
.filters select, .filters input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
.filters input { flex: 1; max-width: 260px; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.pill.type { background: #ede7f6; color: #5e35b1; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.red { background: #ffebee; color: #c62828; }
.pill.amber { background: #fff8e1; color: #f57f17; }
.pill.grey { background: #eee; color: #777; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
</style>