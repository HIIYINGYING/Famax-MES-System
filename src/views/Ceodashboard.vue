<template>
  <div class="page">
    <h1>Executive Overview</h1>
    <p class="subtitle">Company-wide performance across Sales, Production, Quality, and Supply Chain</p>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else>
      <!-- Top-line KPIs -->
      <div class="kpi-row">
        <div class="kpi">
          <span class="kpi-label">ACTIVE CUSTOMERS</span>
          <span class="kpi-value">{{ kpi.customers }}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">SALES ORDERS (ALL TIME)</span>
          <span class="kpi-value">{{ kpi.orders }}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">ORDERS IN PROGRESS</span>
          <span class="kpi-value">{{ kpi.ordersInProgress }}</span>
        </div>
        <div class="kpi" :class="{ alert: kpi.overdue > 0 }">
          <span class="kpi-label">OVERDUE ORDERS</span>
          <span class="kpi-value">{{ kpi.overdue }}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">MANUFACTURING ORDERS</span>
          <span class="kpi-value">{{ kpi.mos }}</span>
        </div>
        <div class="kpi" :class="{ alert: kpi.ncrOpen > 0 }">
          <span class="kpi-label">OPEN NCRs</span>
          <span class="kpi-value">{{ kpi.ncrOpen }}</span>
        </div>
      </div>

      <div class="grid-2">
        <!-- Sales pipeline breakdown -->
        <div class="panel">
          <h2>Sales Order Pipeline</h2>
          <div v-for="s in orderStatusBreakdown" :key="s.status" class="bar-row">
            <span class="bar-label">{{ s.status }}</span>
            <div class="bar-track"><div class="bar-fill" :style="{ width: s.pct + '%' }"></div></div>
            <span class="bar-count">{{ s.count }}</span>
          </div>
          <p v-if="orderStatusBreakdown.length === 0" class="empty">No orders yet.</p>
        </div>

        <!-- Manufacturing / production status -->
        <div class="panel">
          <h2>Manufacturing Order Status</h2>
          <div v-for="s in moStatusBreakdown" :key="s.status" class="bar-row">
            <span class="bar-label">{{ s.status }}</span>
            <div class="bar-track"><div class="bar-fill production" :style="{ width: s.pct + '%' }"></div></div>
            <span class="bar-count">{{ s.count }}</span>
          </div>
          <p v-if="moStatusBreakdown.length === 0" class="empty">No manufacturing orders yet.</p>
        </div>
      </div>

      <div class="grid-2">
        <!-- Quality snapshot -->
        <div class="panel">
          <h2>Quality Snapshot</h2>
          <div class="mini-stats">
            <div><span class="mini-value">{{ quality.passRate }}%</span><span class="mini-label">Overall Pass Rate</span></div>
            <div><span class="mini-value" :class="{ warn: quality.ncrOpen > 0 }">{{ quality.ncrOpen }}</span><span class="mini-label">Open NCRs</span></div>
            <div><span class="mini-value">{{ quality.inspected }}</span><span class="mini-label">Inspections Logged</span></div>
          </div>
        </div>

        <!-- Machine fleet status -->
        <div class="panel">
          <h2>Machine Fleet Status</h2>
          <div class="fleet-row">
            <div class="fleet-dot"><span class="dot green"></span> Available <strong>{{ machines.available }}</strong></div>
            <div class="fleet-dot"><span class="dot blue"></span> Running <strong>{{ machines.running }}</strong></div>
            <div class="fleet-dot"><span class="dot amber"></span> Setup <strong>{{ machines.setup }}</strong></div>
            <div class="fleet-dot"><span class="dot red"></span> Maintenance <strong>{{ machines.maintenance }}</strong></div>
          </div>
        </div>
      </div>

      <!-- Inventory health -->
      <div class="panel">
        <h2>Inventory Health</h2>
        <div class="inv-grid">
          <div class="inv-card">
            <h3>Raw Material</h3>
            <p><span class="dot red"></span> {{ inventory.rawMaterial.outOfStock }} Out of Stock</p>
            <p><span class="dot amber"></span> {{ inventory.rawMaterial.lowStock }} Low Stock</p>
          </div>
          <div class="inv-card">
            <h3>Tooling</h3>
            <p><span class="dot red"></span> {{ inventory.tooling.outOfStock }} Out of Stock</p>
            <p><span class="dot amber"></span> {{ inventory.tooling.lowStock }} Low Stock</p>
          </div>
          <div class="inv-card">
            <h3>Gauge</h3>
            <p><span class="dot red"></span> {{ inventory.gauge.outOfStock }} Out of Stock</p>
            <p><span class="dot amber"></span> {{ inventory.gauge.lowStock }} Low Stock</p>
          </div>
        </div>
      </div>

      <!-- Recent activity -->
      <div class="panel">
        <h2>Recent Sales Orders</h2>
        <table>
          <thead><tr><th>Order No</th><th>Customer</th><th>Order Date</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="o in recentOrders" :key="o.id">
              <td>{{ o.order_no }}</td>
              <td>{{ o.customers?.customer_name }}</td>
              <td>{{ o.order_date }}</td>
              <td><span class="pill">{{ o.status }}</span></td>
            </tr>
            <tr v-if="recentOrders.length === 0"><td colspan="4" class="empty">No sales orders yet.</td></tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from "vue";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader.vue";

const loading = ref(true);
const error = ref(null);

const kpi = reactive({ customers: 0, orders: 0, ordersInProgress: 0, overdue: 0, mos: 0, ncrOpen: 0 });
const quality = reactive({ passRate: 0, ncrOpen: 0, inspected: 0 });
const machines = reactive({ available: 0, running: 0, setup: 0, maintenance: 0 });
const inventory = reactive({
  rawMaterial: { lowStock: 0, outOfStock: 0 },
  tooling: { lowStock: 0, outOfStock: 0 },
  gauge: { lowStock: 0, outOfStock: 0 },
});

const orderStatusCounts = ref({});
const moStatusCounts = ref({});
const recentOrders = ref([]);

const orderStatusBreakdown = computed(() => toBreakdown(orderStatusCounts.value));
const moStatusBreakdown = computed(() => toBreakdown(moStatusCounts.value));

function toBreakdown(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  return Object.entries(counts)
    .map(([status, count]) => ({ status, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

function tally(rows, key) {
  const counts = {};
  for (const r of rows) counts[r[key]] = (counts[r[key]] || 0) + 1;
  return counts;
}

async function loadDashboard() {
  loading.value = true;
  try {
    const [
      customersRes, ordersRes, mosRes, ncrOpenRes,
      inventoryRes, machinesRes, recentRes,
      iqcRes, ipqcRes, oqcRes,
    ] = await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
      supabase.from("sales_orders").select("status, due_date"),
      supabase.from("manufacturing_orders").select("status"),
      supabase.from("ncr_records").select("id", { count: "exact", head: true }).eq("status", "OPEN"),
      supabase.from("inventory_items").select("category, status"),
      supabase.from("machines").select("status"),
      supabase.from("sales_orders").select("*, customers(customer_name)").order("order_date", { ascending: false }).limit(6),
      supabase.from("iqc_inspections").select("status"),
      supabase.from("ipqc_inspections").select("status"),
      supabase.from("oqc_inspections").select("status"),
    ]);

    kpi.customers = customersRes.count ?? 0;

    const orders = ordersRes.data ?? [];
    kpi.orders = orders.length;
    kpi.ordersInProgress = orders.filter((o) => ["CONFIRMED", "SENT_TO_ENG", "IN_PROGRESS"].includes(o.status)).length;
    const today = new Date();
    kpi.overdue = orders.filter((o) => o.due_date && new Date(o.due_date) < today && o.status !== "COMPLETED").length;
    orderStatusCounts.value = tally(orders, "status");

    const mos = mosRes.data ?? [];
    kpi.mos = mos.length;
    moStatusCounts.value = tally(mos, "status");

    kpi.ncrOpen = ncrOpenRes.count ?? 0;
    quality.ncrOpen = ncrOpenRes.count ?? 0;

    const allInspections = [...(iqcRes.data ?? []), ...(ipqcRes.data ?? []), ...(oqcRes.data ?? [])];
    quality.inspected = allInspections.length;
    const passed = allInspections.filter((i) => i.status === "PASS_CHECK" || i.status === "COMPLETED").length;
    quality.passRate = allInspections.length > 0 ? Math.round((passed / allInspections.length) * 100) : 0;

    const catMap = { RAW_MATERIAL: "rawMaterial", TOOLING: "tooling", GAUGE: "gauge" };
    for (const item of inventoryRes.data ?? []) {
      const key = catMap[item.category];
      if (!key) continue;
      if (item.status === "LOW_STOCK") inventory[key].lowStock++;
      if (item.status === "OUT_OF_STOCK") inventory[key].outOfStock++;
    }

    for (const m of machinesRes.data ?? []) {
      if (m.status === "AVAILABLE") machines.available++;
      else if (m.status === "RUNNING") machines.running++;
      else if (m.status === "SETUP") machines.setup++;
      else if (m.status === "MAINTENANCE") machines.maintenance++;
    }

    recentOrders.value = recentRes.data ?? [];
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>

<style scoped>
.page { padding: 24px; }
h1 {
  margin: 0 0 4px;
  font-size: 20px;
}

.subtitle {
  margin: 0 0 24px;
  color: #777;
  font-size: 13px;
}
.loading, .error { padding: 16px 0; color: #777; font-size: 13px; }
.error { color: #c62828; }

.kpi-row { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
.kpi {
  flex: 1;
  min-width: 140px;
  background: #fff;
  border: 1px solid #e2e2e2;
  border-radius: 8px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.kpi.alert { border-color: #e53935; background: #fff5f5; }
.kpi-label { font-size: 10px; font-weight: 700; color: #888; letter-spacing: 0.5px; }
.kpi-value { font-size: 26px; font-weight: 700; color: #1a237e; }
.kpi.alert .kpi-value { color: #c62828; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.panel { background: #fff; border: 1px solid #e2e2e2; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
.panel h2 { font-size: 14px; margin: 0 0 14px; color: #333; }
.panel h3 { font-size: 12px; margin: 0 0 8px; color: #555; }

.bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 12px; }
.bar-label { width: 110px; color: #666; text-transform: capitalize; }
.bar-track { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: #3f51b5; border-radius: 4px; }
.bar-fill.production { background: #00897b; }
.bar-count { width: 24px; text-align: right; font-weight: 600; color: #333; }

.mini-stats { display: flex; gap: 24px; }
.mini-stats > div { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.mini-value { font-size: 24px; font-weight: 700; }
.mini-value.warn { color: #c62828; }
.mini-label { font-size: 11px; color: #888; text-align: center; }

.fleet-row { display: flex; flex-wrap: wrap; gap: 20px; }
.fleet-dot { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #555; }
.fleet-dot strong { margin-left: 4px; }
.dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.dot.green { background: #2e7d32; }
.dot.blue { background: #1565c0; }
.dot.amber { background: #f57f17; }
.dot.red { background: #c62828; }

.inv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.inv-card { border: 1px solid #eee; border-radius: 6px; padding: 12px; }
.inv-card p { font-size: 13px; margin: 4px 0; display: flex; align-items: center; gap: 8px; }

table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { background: #e8edff; color: #3f51b5; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.empty { color: #aaa; font-size: 12px; text-align: center; padding: 8px 0; }
</style>