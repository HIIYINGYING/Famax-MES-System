<template>
  <div class="dashboard">
    <h1>Admin Overview</h1>
    <p class="subtitle">System-wide summary across all departments</p>

    <div v-if="loading" class="loading">Loading dashboard…</div>
    <div v-else-if="error" class="error">Couldn't load dashboard data: {{ error }}</div>

    <template v-else>
      <div class="stat-cards">
        <div class="card">
          <span class="label">CUSTOMERS</span>
          <span class="value">{{ stats.customers }}</span>
        </div>
        <div class="card">
          <span class="label">SALES ORDERS</span>
          <span class="value">{{ stats.salesOrders }}</span>
        </div>
        <div class="card">
          <span class="label">MANUFACTURING ORDERS</span>
          <span class="value">{{ stats.manufacturingOrders }}</span>
        </div>
        <div class="card warn" :class="{ alert: stats.lowStockItems > 0 }">
          <span class="label">LOW / OUT OF STOCK</span>
          <span class="value">{{ stats.lowStockItems }}</span>
        </div>
      </div>

      <div class="section">
        <h2>Recent Sales Orders</h2>
        <table>
          <thead>
            <tr>
              <th>Order No</th>
              <th>Customer</th>
              <th>Order Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in recentOrders" :key="order.id">
              <td>{{ order.order_no }}</td>
              <td>{{ order.customers?.customer_name }}</td>
              <td>{{ order.order_date }}</td>
              <td><span class="status-pill">{{ order.status }}</span></td>
            </tr>
            <tr v-if="recentOrders.length === 0">
              <td colspan="4" class="empty">No sales orders yet.</td>
            </tr>
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
const recentOrders = ref([]);

const stats = reactive({
  customers: 0,
  salesOrders: 0,
  manufacturingOrders: 0,
  lowStockItems: 0,
});

async function loadDashboard() {
  loading.value = true;
  error.value = null;
  try {
    const [customers, salesOrders, mos, lowStock, recent] = await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("sales_orders").select("id", { count: "exact", head: true }),
      supabase.from("manufacturing_orders").select("id", { count: "exact", head: true }),
      supabase
        .from("inventory_items")
        .select("id", { count: "exact", head: true })
        .in("status", ["LOW_STOCK", "OUT_OF_STOCK"]),
      supabase
        .from("sales_orders")
        .select("id, order_no, order_date, status, customers(customer_name)")
        .order("order_date", { ascending: false })
        .limit(5),
    ]);

    for (const r of [customers, salesOrders, mos, lowStock, recent]) {
      if (r.error) throw r.error;
    }

    stats.customers = customers.count ?? 0;
    stats.salesOrders = salesOrders.count ?? 0;
    stats.manufacturingOrders = mos.count ?? 0;
    stats.lowStockItems = lowStock.count ?? 0;
    recentOrders.value = recent.data ?? [];
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>

<style scoped>
.dashboard {
  padding: 24px;
}

h1 {
  margin: 0 0 4px;
  font-size: 20px;
}

.subtitle {
  margin: 0 0 24px;
  color: #777;
  font-size: 13px;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.card {
  background: #fff;
  border: 1px solid #e2e2e2;
  border-radius: 6px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.card.alert {
  border-color: #e53935;
  background: #fff5f5;
}

.label {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  letter-spacing: 0.5px;
  text-align: center;
}

.value {
  font-size: 30px;
  font-weight: 700;
}

.card.alert .value {
  color: #c62828;
}

.section {
  background: #fff;
  border: 1px solid #e2e2e2;
  border-radius: 6px;
  padding: 20px;
}

.section h2 {
  margin: 0 0 12px;
  font-size: 14px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th {
  text-align: left;
  color: #888;
  font-weight: 600;
  padding: 8px;
  border-bottom: 1px solid #eee;
}

td {
  padding: 8px;
  border-bottom: 1px solid #f2f2f2;
}

.status-pill {
  background: #e8edff;
  color: #3f51b5;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.empty {
  text-align: center;
  color: #999;
  padding: 16px;
}

.loading,
.error {
  padding: 16px 0;
  font-size: 13px;
  color: #777;
}

.error {
  color: #c62828;
}
</style>