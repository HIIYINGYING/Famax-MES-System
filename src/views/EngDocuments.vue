<template>
  <div class="page">
    <h1>Documents</h1>
    <p class="subtitle">Manufacturing technical documents by part</p>

    <input class="search" v-model="search" placeholder="Search part number or name…" />

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <table v-else>
        <thead><tr><th>Part Number</th><th>Part Name</th><th>Revision</th><th>Customer Drawing</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="mo in filteredMOs" :key="mo.id">
            <td>{{ mo.part_number }}</td>
            <td>{{ mo.part_name }}</td>
            <td>{{ mo.revision || "-" }}</td>
            <td>
              <a v-if="mo.drawing" :href="mo.drawing.file_url" target="_blank">{{ mo.drawing.file_name }}</a>
              <span v-else class="incomplete">Missing</span>
            </td>
            <td>
              <span class="pill" :class="isComplete(mo) ? 'green' : 'red'">{{ isComplete(mo) ? "Complete" : "Incomplete" }}</span>
            </td>
            <td><a href="#" @click.prevent="openView(mo)">View</a></td>
          </tr>
          <tr v-if="filteredMOs.length === 0"><td colspan="6" class="empty">No documents found.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- VIEW DETAIL -->
    <div v-if="viewing" class="modal-backdrop" @click.self="viewing = null">
      <div class="modal">
        <header class="modal-header">
          <span class="mo-no">{{ viewing.part_number }} — {{ viewing.part_name }}</span>
          <button class="icon-btn" @click="viewing = null">✕</button>
        </header>

        <section class="info-block">
          <h3>Process Sequence</h3>
          <table class="inner-table">
            <thead><tr><th>#</th><th>Process</th><th>Image</th><th>Remarks</th></tr></thead>
            <tbody>
              <tr v-for="s in steps" :key="s.id">
                <td>{{ s.step_no }}</td>
                <td>{{ s.process_name }}</td>
                <td><a v-if="s.process_image_url" :href="s.process_image_url" target="_blank">View</a><span v-else>-</span></td>
                <td>{{ s.remarks || "-" }}</td>
              </tr>
              <tr v-if="steps.length === 0"><td colspan="4" class="empty">No process steps.</td></tr>
            </tbody>
          </table>
        </section>

        <section class="info-block">
          <h3>Required Tooling</h3>
          <ul class="plain-list">
            <li v-for="r in requiredItems.filter(r => r.category === 'TOOLING')" :key="r.id">
              {{ r.inventory_items?.item_name }} — Qty {{ r.quantity }}
            </li>
            <li v-if="requiredItems.filter(r => r.category === 'TOOLING').length === 0" class="empty-inline">None specified.</li>
          </ul>
        </section>

        <section class="info-block">
          <h3>Required Gauges</h3>
          <ul class="plain-list">
            <li v-for="r in requiredItems.filter(r => r.category === 'GAUGE')" :key="r.id">
              {{ r.inventory_items?.item_name }} — Qty {{ r.quantity }}
            </li>
            <li v-if="requiredItems.filter(r => r.category === 'GAUGE').length === 0" class="empty-inline">None specified.</li>
          </ul>
        </section>

        <section class="info-block">
          <h3>Work Instruction</h3>
          <ul v-if="wiDocs.length" class="doc-file-list">
            <li v-for="d in wiDocs" :key="d.id"><a :href="d.file_url" target="_blank">{{ d.file_name }}</a></li>
          </ul>
          <p v-else class="doc-empty-text">No WI uploaded.</p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader.vue";

const loading = ref(true);
const search = ref("");
const mos = ref([]);

const viewing = ref(null);
const steps = ref([]);
const requiredItems = ref([]);
const wiDocs = ref([]);

const filteredMOs = computed(() => {
  if (!search.value.trim()) return mos.value;
  const q = search.value.toLowerCase();
  return mos.value.filter((m) => m.part_number.toLowerCase().includes(q) || m.part_name.toLowerCase().includes(q));
});

function isComplete(mo) {
  return !!mo.drawing && ["FINAL_REVIEW", "SENT_TO_PP"].includes(mo.status);
}

async function loadMOs() {
  loading.value = true;
  const { data } = await supabase.from("manufacturing_orders").select("*").order("part_number");
  const list = data ?? [];

  // Attach customer drawing (from the originating sales order) per MO
  for (const mo of list) {
    const { data: docs } = await supabase
      .from("documents")
      .select("*")
      .eq("owner_type", "SALES_ORDER")
      .eq("owner_id", mo.sales_order_id)
      .eq("doc_type", "CUSTOMER_DRAWING")
      .limit(1);
    mo.drawing = docs?.[0] || null;
  }

  mos.value = list;
  loading.value = false;
}

async function openView(mo) {
  viewing.value = mo;
  const [stepsRes, itemsRes, docsRes] = await Promise.all([
    supabase.from("mo_process_steps").select("*").eq("manufacturing_order_id", mo.id).order("step_no"),
    supabase.from("mo_required_items").select("*, inventory_items(item_name)").eq("manufacturing_order_id", mo.id),
    supabase.from("documents").select("*").eq("owner_type", "MANUFACTURING_ORDER").eq("owner_id", mo.id).eq("doc_type", "WORK_INSTRUCTION"),
  ]);
  steps.value = stepsRes.data ?? [];
  requiredItems.value = itemsRes.data ?? [];
  wiDocs.value = docsRes.data ?? [];
}

onMounted(loadMOs);
</script>

<style scoped>
.page { padding: 24px; }
h1 {  margin: 0 0 4px; font-size: 20px;}
.subtitle {  margin: 0 0 24px;  color: #777;  font-size: 13px;}
.search { width: 100%; max-width: 320px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; margin-bottom: 12px; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.incomplete { color: #c62828; font-size: 12px; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.red { background: #ffebee; color: #c62828; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; overflow-y: auto; padding: 24px 0; }
.modal { background: #fff; border-radius: 10px; width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 12px 36px rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid #eee; }
.mo-no { font-size: 15px; font-weight: 700; }
.icon-btn { border: none; background: none; font-size: 16px; cursor: pointer; color: #888; }
.info-block { padding: 16px 24px; border-bottom: 1px solid #f2f2f2; }
.info-block:last-of-type { border-bottom: none; }
.info-block h3 { font-size: 12px; text-transform: uppercase; color: #888; margin: 0 0 10px; font-weight: 700; }
.inner-table th, .inner-table td { font-size: 12px; }
.plain-list { list-style: none; margin: 0; padding: 0; font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
.empty-inline { color: #aaa; font-size: 12px; }
.doc-file-list { list-style: none; margin: 0; padding: 0; font-size: 12px; }
.doc-file-list a { color: #3f51b5; }
.doc-empty-text { font-size: 12px; color: #aaa; }
</style>