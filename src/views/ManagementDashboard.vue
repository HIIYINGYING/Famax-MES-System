<template>
  <div class="dashboard">
    <h1>Production Dashboard</h1>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else>
      <div class="stat-cards">
        <div class="card"><span class="label">PRODUCTION</span><span class="value">{{ stats.production }}</span></div>
        <div class="card"><span class="label">COMPLETED</span><span class="value">{{ stats.completed }}</span></div>
        <div class="card"><span class="label">ONGOING</span><span class="value">{{ stats.ongoing }}</span></div>
        <div class="card" :class="{ alert: stats.overdue > 0 }"><span class="label">OVERDUE</span><span class="value">{{ stats.overdue }}</span></div>
      </div>
      <div class="stat-cards">
        <div class="card"><span class="label">PASS RATE</span><span class="value">{{ stats.passRate }}%</span></div>
        <div class="card" :class="{ alert: stats.ncrOpen > 0 }"><span class="label">NCR</span><span class="value">{{ stats.ncrOpen }}</span></div>
        <div class="card"><span class="label">MACHINE RUNNING</span><span class="value">{{ stats.machineRunning }}</span></div>
        <div class="card" :class="{ alert: stats.breakdown > 0 }"><span class="label">BREAKDOWN</span><span class="value">{{ stats.breakdown }}</span></div>
      </div>

      <div class="section">
        <h2>Recent System Activity</h2>
        <table>
          <thead><tr><th>Date & Time</th><th>Activity</th></tr></thead>
          <tbody>
            <tr v-for="a in activity" :key="a.id">
              <td>{{ new Date(a.occurred_at).toLocaleString() }}</td>
              <td>{{ a.action }}</td>
            </tr>
            <tr v-if="activity.length === 0"><td colspan="2" class="empty">No recent activity.</td></tr>
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
const activity = ref([]);

const stats = reactive({
  production: 0, completed: 0, ongoing: 0, overdue: 0,
  passRate: 0, ncrOpen: 0, machineRunning: 0, breakdown: 0,
});

async function loadDashboard() {
  loading.value = true;
  try {
    const [plansTotal, completed, ongoing, ncrOpen, running, breakdown, log] = await Promise.all([
      supabase.from("process_plans").select("id", { count: "exact", head: true }),
      supabase.from("process_plans").select("id", { count: "exact", head: true }).eq("status", "COMPLETED"),
      supabase.from("process_plans").select("id", { count: "exact", head: true }).eq("status", "IN_PROGRESS"),
      supabase.from("ncr_records").select("id", { count: "exact", head: true }).eq("status", "OPEN"),
      supabase.from("machines").select("id", { count: "exact", head: true }).eq("status", "RUNNING"),
      supabase.from("machines").select("id", { count: "exact", head: true }).eq("status", "MAINTENANCE"),
      supabase.from("system_log").select("*").order("occurred_at", { ascending: false }).limit(5),
    ]);

    for (const r of [plansTotal, completed, ongoing, ncrOpen, running, breakdown, log]) {
      if (r.error) throw r.error;
    }

    stats.production = plansTotal.count ?? 0;
    stats.completed = completed.count ?? 0;
    stats.ongoing = ongoing.count ?? 0;
    stats.overdue = 0; // requires comparing estimated_completion to now — refine once real dates are in
    stats.ncrOpen = ncrOpen.count ?? 0;
    stats.machineRunning = running.count ?? 0;
    stats.breakdown = breakdown.count ?? 0;
    stats.passRate = 0; // requires QC pass/fail aggregation — placeholder until QC data volume exists
    activity.value = log.data ?? [];
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
.label { font-size: 11px; font-weight: 600; color: #666; letter-spacing: 0.5px; text-align: center; }
.value { font-size: 28px; font-weight: 700; }
.card.alert .value { color: #c62828; }
.section { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 20px; margin-top: 16px; }
.section h2 { margin: 0 0 12px; font-size: 14px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.loading, .error, .empty { padding: 16px 0; font-size: 13px; color: #777; text-align: center; }
.error { color: #c62828; }
</style>