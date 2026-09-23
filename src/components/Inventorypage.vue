<template>
  <div class="page">
    <div class="page-header">
      <h1>{{ title }}</h1>
      <button class="primary" @click="showCreate = !showCreate">
        {{ showCreate ? "Cancel" : "Add " + title }}
      </button>
    </div>

    <form v-if="showCreate" class="card form-grid" @submit.prevent="createItem">
      <div>
        <label>Item Code</label>
        <input v-model="form.item_code" required />
      </div>
      <div>
        <label>{{ nameLabel }}</label>
        <input v-model="form.item_name" required />
      </div>
      <div v-if="category === 'TOOLING'">
        <label>Brand</label>
        <input v-model="form.brand" />
      </div>
      <div v-if="category === 'TOOLING'">
        <label>Location</label>
        <input v-model="form.location" />
      </div>
      <div v-if="category === 'GAUGE'">
        <label>For Process</label>
        <input v-model="form.for_process" placeholder="e.g. Turning 1" />
      </div>
      <div>
        <label>Shelf</label>
        <input v-model="form.shelf" />
      </div>
      <div>
        <label>Stock Balance (PCS)</label>
        <input v-model.number="form.stock_balance" type="number" required />
      </div>
      <div class="span-2">
        <button class="primary" type="submit" :disabled="saving">
          {{ saving ? "Saving…" : "Submit" }}
        </button>
      </div>
      <p v-if="formError" class="error span-2">{{ formError }}</p>
    </form>

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="error" class="error">{{ error }}</div>

      <table v-else>
        <thead>
          <tr>
            <th>Item</th>
            <th>{{ nameLabel }}</th>
            <th v-if="category === 'TOOLING'">Brand</th>
            <th v-if="category === 'TOOLING'">Location</th>
            <th v-if="category === 'GAUGE'">For Process</th>
            <th>Shelf</th>
            <th>Available</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>{{ item.item_code }}</td>
            <td>{{ item.item_name }}</td>
            <td v-if="category === 'TOOLING'">{{ item.brand || "-" }}</td>
            <td v-if="category === 'TOOLING'">{{ item.location || "-" }}</td>
            <td v-if="category === 'GAUGE'">{{ item.for_process || "-" }}</td>
            <td>{{ item.shelf || "-" }}</td>
            <td>{{ item.stock_balance }}</td>
            <td>
              <span class="pill" :class="statusClass(item.status)">{{ item.status.replace('_',' ') }}</span>
            </td>
          </tr>
          <tr v-if="items.length === 0">
            <td colspan="8" class="empty">No {{ title.toLowerCase() }} records yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from "vue";
import { supabase } from "@/lib/supabase";

const props = defineProps({
  category: { type: String, required: true }, // 'RAW_MATERIAL' | 'TOOLING' | 'GAUGE'
  title: { type: String, required: true },
  nameLabel: { type: String, default: "Name" },
});

const items = ref([]);
const loading = ref(true);
const error = ref(null);

const showCreate = ref(false);
const saving = ref(false);
const formError = ref(null);
const form = reactive({
  item_code: "", item_name: "", brand: "", location: "", for_process: "", shelf: "", stock_balance: 0,
});

function statusClass(s) {
  if (s === "IN_STOCK") return "green";
  if (s === "LOW_STOCK") return "amber";
  return "red";
}

function deriveStatus(qty) {
  if (qty <= 0) return "OUT_OF_STOCK";
  if (qty < 5) return "LOW_STOCK";
  return "IN_STOCK";
}

async function loadItems() {
  loading.value = true;
  error.value = null;
  const { data, error: err } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("category", props.category)
    .order("item_code");
  if (err) error.value = err.message;
  else items.value = data;
  loading.value = false;
}

async function createItem() {
  saving.value = true;
  formError.value = null;
  const { error: err } = await supabase.from("inventory_items").insert({
    category: props.category,
    item_code: form.item_code,
    item_name: form.item_name,
    brand: form.brand || null,
    location: form.location || null,
    for_process: form.for_process || null,
    shelf: form.shelf || null,
    stock_balance: form.stock_balance,
    status: deriveStatus(form.stock_balance),
  });
  saving.value = false;
  if (err) {
    formError.value = err.message;
    return;
  }
  showCreate.value = false;
  Object.assign(form, { item_code: "", item_name: "", brand: "", location: "", for_process: "", shelf: "", stock_balance: 0 });
  loadItems();
}

watch(() => props.category, loadItems);
onMounted(loadItems);
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h1 { font-size: 20px; margin: 0; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
input { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.amber { background: #fff8e1; color: #f57f17; }
.pill.red { background: #ffebee; color: #c62828; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.primary:disabled { opacity: 0.6; cursor: not-allowed; }
.error { color: #c62828; font-size: 13px; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
</style>