<template>
  <div class="dashboard">
    <h1>Production Planner Dashboard</h1>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else>
      <div class="stat-cards">
        <div class="card"><span class="label">OPEN MO</span><span class="value">{{ stats.openMO }}</span></div>
        <div class="card"><span class="label">TODAY'S PRODUCTION PLAN</span><span class="value">{{ stats.todayPlans }}</span></div>
        <div class="card" :class="{ alert: stats.overdue > 0 }"><span class="label">OVERDUE TASKS</span><span class="value">{{ stats.overdue }}</span></div>
        <div class="card"><span class="label">MACHINE AVAILABILITY</span><span class="value">{{ stats.machinesAvailable }} / {{ stats.machinesTotal }}</span></div>
      </div>

      <div class="section">
        <h2>Current Production Orders</h2>
        <table>
          <thead><tr><th>Order No</th><th>Part No</th><th>Part Name</th><th>Qty</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="p in currentOrders" :key="p.id">
              <td>{{ p.order_no }}</td>
              <td>{{ p.part_no }}</td>
              <td>{{ p.part_name }}</td>
              <td>{{ p.quantity }}</td>
              <td><span class="pill">{{ p.status }}</span></td>
            </tr>
            <tr v-if="currentOrders.length === 0"><td colspan="5" class="empty">No active production orders.</td></tr>
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
const currentOrders = ref([]);

const stats = reactive({
  openMO: 0, todayPlans: 0, overdue: 0, machinesAvailable: 0, machinesTotal: 0,
});

async function loadDashboard() {
  loading.value = true;
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [openMO, todayPlans, machinesAvail, machinesTotal, orders] = await Promise.all([
      supabase.from("manufacturing_orders").select("id", { count: "exact", head: true }).neq("status", "COMPLETED"),
      supabase.from("process_plans").select("id", { count: "exact", head: true }).gte("created_at", today),
      supabase.from("machines").select("id", { count: "exact", head: true }).eq("status", "AVAILABLE"),
      supabase.from("machines").select("id", { count: "exact", head: true }),
      supabase.from("process_plans").select("*").in("status", ["SCHEDULED", "IN_PROGRESS"]).order("created_at", { ascending: false }).limit(10),
    ]);

    for (const r of [openMO, todayPlans, machinesAvail, machinesTotal, orders]) {
      if (r.error) throw r.error;
    }

    stats.openMO = openMO.count ?? 0;
    stats.todayPlans = todayPlans.count ?? 0;
    stats.machinesAvailable = machinesAvail.count ?? 0;
    stats.machinesTotal = machinesTotal.count ?? 0;
    // Overdue: plans past their estimated_completion still not COMPLETED
    const overdueRes = await supabase
      .from("process_plans")
      .select("id", { count: "exact", head: true })
      .lt("estimated_completion", new Date().toISOString())
      .neq("status", "COMPLETED");
    stats.overdue = overdueRes.count ?? 0;

    currentOrders.value = orders.data ?? [];
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
.value { font-size: 26px; font-weight: 700; }
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