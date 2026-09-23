<template>
  <div class="dashboard">
    <h1>Business Development</h1>
    <p class="subtitle">Customer and Sales Order Management</p>

    <div v-if="loading" class="loading">Loading dashboard…</div>
    <div v-else-if="error" class="error">Couldn't load dashboard data: {{ error }}</div>

    <template v-else>
      <div class="stat-cards">
        <div class="card">
          <span class="label">CUSTOMER</span>
          <span class="value">{{ stats.customerCount }}</span>
        </div>
        <div class="card">
          <span class="label">NEW ORDERS</span>
          <span class="value">{{ stats.newOrders }}</span>
        </div>
        <div class="card">
          <span class="label">REVIEW</span>
          <span class="value">{{ stats.review }}</span>
        </div>
        <div class="card" :class="{ alert: stats.pending > 0 }">
          <span class="label">PENDING</span>
          <span class="value">{{ stats.pending }}</span>
        </div>
      </div>

      <div class="section">
        <h2>Upcoming Due Orders</h2>
        <table>
          <thead><tr><th>Order No</th><th>Customer</th><th>Due Date</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="o in upcomingDue" :key="o.id" :class="{ overdue: isOverdue(o.due_date) }">
              <td>{{ o.order_no }}</td>
              <td>{{ o.customers?.customer_name }}</td>
              <td>{{ o.due_date }}</td>
              <td><span class="pill">{{ o.status }}</span></td>
            </tr>
            <tr v-if="upcomingDue.length === 0"><td colspan="4" class="empty">No upcoming due orders.</td></tr>
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
const upcomingDue = ref([]);

const stats = reactive({
  customerCount: 0,
  newOrders: 0,
  review: 0,
  pending: 0,
});

function isOverdue(dueDate) {
  return dueDate && new Date(dueDate) < new Date();
}

// "New Orders" / "Review" / "Pending" are mapped to CREATED /
// CONFIRMED / SENT_TO_ENG per the current sales order status flow.
async function loadDashboard() {
  loading.value = true;
  error.value = null;
  try {
    const [customers, newOrders, review, pending, dueOrders] = await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("sales_orders").select("id", { count: "exact", head: true }).eq("status", "CREATED"),
      supabase.from("sales_orders").select("id", { count: "exact", head: true }).eq("status", "CONFIRMED"),
      supabase.from("sales_orders").select("id", { count: "exact", head: true }).eq("status", "SENT_TO_ENG"),
      supabase
        .from("sales_orders")
        .select("*, customers(customer_name)")
        .not("due_date", "is", null)
        .neq("status", "COMPLETED")
        .order("due_date", { ascending: true })
        .limit(8),
    ]);

    for (const r of [customers, newOrders, review, pending, dueOrders]) {
      if (r.error) throw r.error;
    }

    stats.customerCount = customers.count ?? 0;
    stats.newOrders = newOrders.count ?? 0;
    stats.review = review.count ?? 0;
    stats.pending = pending.count ?? 0;
    upcomingDue.value = dueOrders.data ?? [];
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
  grid-template-columns: repeat(4, minmax(140px, 1fr));
  gap: 16px;
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

.label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  letter-spacing: 0.5px;
}

.value {
  font-size: 32px;
  font-weight: 700;
}

.card.alert {
  border-color: #e53935;
  background: #fff5f5;
}

.card.alert .value {
  color: #c62828;
}

.section {
  background: #fff;
  border: 1px solid #e2e2e2;
  border-radius: 6px;
  padding: 20px;
  margin-top: 16px;
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
  padding: 8px;
  border-bottom: 1px solid #eee;
}

td {
  padding: 8px;
  border-bottom: 1px solid #f2f2f2;
}

tr.overdue {
  background: #fff5f5;
}

.pill {
  background: #e8edff;
  color: #3f51b5;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.loading,
.error,
.empty {
  padding: 16px 0;
  font-size: 13px;
  color: #777;
  text-align: center;
}

.error {
  color: #c62828;
}
</style>