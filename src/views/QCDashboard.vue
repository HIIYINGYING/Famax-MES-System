<template>
  <div class="dashboard">
    <h1>QAQC Dashboard</h1>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else>
      <div class="stat-cards">
        <div class="card"><span class="label">PENDING</span><span class="value">{{ stats.pending }}</span></div>
        <div class="card"><span class="label">IN PROGRESS</span><span class="value">{{ stats.inProgress }}</span></div>
        <div class="card"><span class="label">PASSED</span><span class="value">{{ stats.passed }}</span></div>
        <div class="card" :class="{ alert: stats.failed > 0 }"><span class="label">FAILED</span><span class="value">{{ stats.failed }}</span></div>
      </div>

      <div class="section">
        <h2>Current IPQC Activity</h2>
        <table>
          <thead><tr><th>Order No</th><th>Part Name</th><th>Process</th><th>Machine</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="a in currentIpqc" :key="a.id">
              <td>{{ a.order_no }}</td>
              <td>{{ a.part_name }}</td>
              <td>{{ a.process_name }}</td>
              <td>{{ a.machine_code || "-" }}</td>
              <td><span class="pill">{{ a.status }}</span></td>
            </tr>
            <tr v-if="currentIpqc.length === 0"><td colspan="5" class="empty">No IPQC activity right now.</td></tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const loading = ref(true);
const error = ref(null);
const currentIpqc = ref([]);
const stats = reactive({ pending: 0, inProgress: 0, passed: 0, failed: 0 });

async function loadDashboard() {
  loading.value = true;
  try {
    const countFor = (table, status) =>
      supabase.from(table).select("id", { count: "exact", head: true }).eq("status", status);

    const [
      iqcPending, ipqcPending, oqcPending,
      iqcProgress, ipqcProgress, oqcProgress,
      iqcPass, ipqcPass, oqcPass,
      iqcFail, ipqcFail, oqcFail,
      currentActivity,
    ] = await Promise.all([
      countFor("iqc_inspections", "PENDING"), countFor("ipqc_inspections", "PENDING"), countFor("oqc_inspections", "PENDING"),
      countFor("iqc_inspections", "PASS_CHECK"), countFor("ipqc_inspections", "PASS_CHECK"), countFor("oqc_inspections", "PASS_CHECK"),
      countFor("iqc_inspections", "COMPLETED"), countFor("ipqc_inspections", "COMPLETED"), countFor("oqc_inspections", "COMPLETED"),
      countFor("iqc_inspections", "FAIL"), countFor("ipqc_inspections", "FAIL"), countFor("oqc_inspections", "FAIL"),
      supabase.from("ipqc_inspections").select("*").in("status", ["PENDING", "PASS_CHECK", "REINSPECT"]).order("created_at", { ascending: false }).limit(5),
    ]);

    stats.pending = (iqcPending.count ?? 0) + (ipqcPending.count ?? 0) + (oqcPending.count ?? 0);
    stats.inProgress = (iqcProgress.count ?? 0) + (ipqcProgress.count ?? 0) + (oqcProgress.count ?? 0);
    stats.passed = (iqcPass.count ?? 0) + (ipqcPass.count ?? 0) + (oqcPass.count ?? 0);
    stats.failed = (iqcFail.count ?? 0) + (ipqcFail.count ?? 0) + (oqcFail.count ?? 0);
    currentIpqc.value = currentActivity.data ?? [];
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>

<style scoped>
.dashboard { padding: 24px; }
h1 { font-size: 20px; margin: 0 0 16px; }
.stat-cards { display: grid; grid-template-columns: repeat(4, minmax(140px, 1fr)); gap: 16px; margin-bottom: 16px; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.card.alert { border-color: #e53935; background: #fff5f5; }
.label { font-size: 11px; font-weight: 600; color: #666; letter-spacing: 0.5px; }
.value { font-size: 28px; font-weight: 700; }
.card.alert .value { color: #c62828; }
.section { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 20px; }
.section h2 { margin: 0 0 12px; font-size: 14px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { background: #e8edff; color: #3f51b5; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.loading, .error, .empty { padding: 16px 0; font-size: 13px; color: #777; text-align: center; }
.error { color: #c62828; }
</style>