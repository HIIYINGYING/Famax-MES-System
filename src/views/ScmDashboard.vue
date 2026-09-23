<template>
  <div class="dashboard">
    <h1>SCM Dashboard</h1>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else>
      <div class="stat-cards">
        <div class="card"><span class="label">BEING PREPARED</span><span class="value">{{ stats.prepared }}</span></div>
        <div class="card" :class="{ alert: stats.underProcurement > 0 }"><span class="label">UNDER PROCUREMENT</span><span class="value">{{ stats.underProcurement }}</span></div>
      </div>

      <div class="category-grid">
        <div class="category-card">
          <h2>Raw Material</h2>
          <p><span class="dot green"></span> {{ counts.rawMaterial.inStock }} In Stock</p>
          <p><span class="dot amber"></span> {{ counts.rawMaterial.lowStock }} Low Stock</p>
          <p><span class="dot red"></span> {{ counts.rawMaterial.outOfStock }} Out of Stock</p>
        </div>
        <div class="category-card">
          <h2>Tooling</h2>
          <p><span class="dot green"></span> {{ counts.tooling.inStock }} In Stock</p>
          <p><span class="dot amber"></span> {{ counts.tooling.lowStock }} Low Stock</p>
          <p><span class="dot red"></span> {{ counts.tooling.outOfStock }} Out of Stock</p>
        </div>
        <div class="category-card">
          <h2>Gauge</h2>
          <p><span class="dot green"></span> {{ counts.gauge.inStock }} In Stock</p>
          <p><span class="dot amber"></span> {{ counts.gauge.lowStock }} Low Stock</p>
          <p><span class="dot red"></span> {{ counts.gauge.outOfStock }} Out of Stock</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const loading = ref(true);
const error = ref(null);
const stats = reactive({ prepared: 0, underProcurement: 0 });
const counts = reactive({
  rawMaterial: { inStock: 0, lowStock: 0, outOfStock: 0 },
  tooling: { inStock: 0, lowStock: 0, outOfStock: 0 },
  gauge: { inStock: 0, lowStock: 0, outOfStock: 0 },
});

async function loadDashboard() {
  loading.value = true;
  try {
    const [prepared, procurement, items] = await Promise.all([
      supabase.from("procurement_requests").select("id", { count: "exact", head: true }).eq("status", "PREPARED"),
      supabase.from("procurement_requests").select("id", { count: "exact", head: true }).eq("status", "IN_PROGRESS"),
      supabase.from("inventory_items").select("category, status"),
    ]);

    stats.prepared = prepared.count ?? 0;
    stats.underProcurement = procurement.count ?? 0;

    const map = { RAW_MATERIAL: "rawMaterial", TOOLING: "tooling", GAUGE: "gauge" };
    for (const item of items.data ?? []) {
      const key = map[item.category];
      if (!key) continue;
      if (item.status === "IN_STOCK") counts[key].inStock++;
      else if (item.status === "LOW_STOCK") counts[key].lowStock++;
      else counts[key].outOfStock++;
    }
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
.stat-cards { display: grid; grid-template-columns: repeat(2, minmax(160px, 1fr)); gap: 16px; margin-bottom: 16px; max-width: 500px; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.card.alert { border-color: #e53935; background: #fff5f5; }
.label { font-size: 11px; font-weight: 600; color: #666; letter-spacing: 0.5px; }
.value { font-size: 28px; font-weight: 700; }
.card.alert .value { color: #c62828; }
.category-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.category-card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; }
.category-card h2 { font-size: 14px; margin: 0 0 12px; }
.category-card p { font-size: 13px; margin: 4px 0; display: flex; align-items: center; gap: 8px; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot.green { background: #2e7d32; }
.dot.amber { background: #f57f17; }
.dot.red { background: #c62828; }
.loading, .error { padding: 16px 0; font-size: 13px; color: #777; }
.error { color: #c62828; }
</style>