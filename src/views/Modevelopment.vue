<template>
  <div class="page">
    <PageHeader title="Manufacturing Order" subtitle="Development and final review" />

    <div class="tabs">
      <button :class="{ active: tab === 'development' }" @click="tab = 'development'">In Development</button>
      <button :class="{ active: tab === 'review' }" @click="tab = 'review'">Final Review</button>
    </div>

    <!-- IN DEVELOPMENT -->
    <div v-if="tab === 'development'" class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <table v-else>
        <thead><tr><th>MO No</th><th>Part No</th><th>Part Name</th><th>Quantity</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="mo in developmentMOs" :key="mo.id">
            <td>{{ mo.mo_no }}</td>
            <td>{{ mo.part_number }}</td>
            <td>{{ mo.part_name }}</td>
            <td>{{ mo.quantity }}</td>
            <td><span class="pill grey">{{ mo.status }}</span></td>
            <td><a href="#" @click.prevent="openUpdate(mo)">Update</a></td>
          </tr>
          <tr v-if="developmentMOs.length === 0"><td colspan="6" class="empty">No manufacturing orders in development.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- FINAL REVIEW -->
    <div v-if="tab === 'review'" class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <table v-else>
        <thead><tr><th>MO No</th><th>Part No</th><th>Part Name</th><th>Quantity</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="mo in reviewMOs" :key="mo.id">
            <td>{{ mo.mo_no }}</td>
            <td>{{ mo.part_number }}</td>
            <td>{{ mo.part_name }}</td>
            <td>{{ mo.quantity }}</td>
            <td><span class="pill amber">{{ mo.status }}</span></td>
            <td><a href="#" @click.prevent="openReview(mo)">Review</a></td>
          </tr>
          <tr v-if="reviewMOs.length === 0"><td colspan="6" class="empty">No manufacturing orders awaiting final review.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ==================== UPDATE MODAL (2.3.2) ==================== -->
    <div v-if="editing" class="modal-backdrop" @click.self="editing = null">
      <div class="modal">
        <header class="modal-header">
          <span class="mo-no">{{ editing.mo_no }} — {{ editing.part_name }}</span>
          <button class="icon-btn" @click="editing = null">✕</button>
        </header>

        <section class="info-block">
          <h3>Process Sequence</h3>
          <div v-for="(step, i) in form.steps" :key="i" class="step-row">
            <input v-model="step.process_name" placeholder="e.g. Cutting" />
            <label class="upload-chip">
              {{ step.uploading ? "Uploading…" : (step.process_image_url ? "Image ✓" : "Add Image") }}
              <input type="file" hidden @change="e => uploadStepImage(e, step)" />
            </label>
            <input v-model="step.remarks" placeholder="Remarks" />
            <button type="button" class="link" @click="form.steps.splice(i, 1)">Remove</button>
          </div>
          <button type="button" class="link" @click="form.steps.push({ process_name: '', remarks: '', process_image_url: '', uploading: false })">
            + Add Process Step
          </button>
        </section>

        <section class="info-block">
          <h3>Required Raw Material</h3>
          <div v-for="(r, i) in form.materials" :key="i" class="req-row">
            <select v-model="r.inventory_item_id"><option value="">Select…</option><option v-for="it in rawMaterials" :key="it.id" :value="it.id">{{ it.item_name }}</option></select>
            <input v-model.number="r.quantity" type="number" placeholder="Qty" style="width:80px" />
            <button type="button" class="link" @click="form.materials.splice(i, 1)">Remove</button>
          </div>
          <button type="button" class="link" @click="form.materials.push({ inventory_item_id: '', quantity: 1 })">+ Add Material</button>
        </section>

        <section class="info-block">
          <h3>Required Tooling</h3>
          <div v-for="(r, i) in form.tooling" :key="i" class="req-row">
            <select v-model="r.inventory_item_id"><option value="">Select…</option><option v-for="it in toolingItems" :key="it.id" :value="it.id">{{ it.item_name }}</option></select>
            <input v-model.number="r.quantity" type="number" placeholder="Qty" style="width:80px" />
            <button type="button" class="link" @click="form.tooling.splice(i, 1)">Remove</button>
          </div>
          <button type="button" class="link" @click="form.tooling.push({ inventory_item_id: '', quantity: 1 })">+ Add Tooling</button>
        </section>

        <section class="info-block">
          <h3>Required Gauges</h3>
          <div v-for="(r, i) in form.gauges" :key="i" class="req-row">
            <select v-model="r.inventory_item_id"><option value="">Select…</option><option v-for="it in gaugeItems" :key="it.id" :value="it.id">{{ it.item_name }}</option></select>
            <input v-model.number="r.quantity" type="number" placeholder="Qty" style="width:80px" />
            <button type="button" class="link" @click="form.gauges.splice(i, 1)">Remove</button>
          </div>
          <button type="button" class="link" @click="form.gauges.push({ inventory_item_id: '', quantity: 1 })">+ Add Gauge</button>
        </section>

        <section class="info-block">
          <button class="secondary" @click="sendRequestsToSCM" :disabled="requestSaving">
            {{ requestSaving ? "Sending…" : "Send Request to SCM" }}
          </button>
          <p v-if="requestConfirmation" class="confirm">{{ requestConfirmation }}</p>

          <table v-if="requestedItems.length" class="inner-table requested-table">
            <thead><tr><th>Category</th><th>Item</th><th>Qty Requested</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="r in requestedItems" :key="r.id">
                <td><span class="pill cat">{{ categoryLabel(r.category) }}</span></td>
                <td>{{ r.inventory_items?.item_name }}</td>
                <td>{{ r.number_requested }}</td>
                <td><span class="pill" :class="reqStatusClass(r.status)">{{ reqStatusLabel(r.status) }}</span></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="info-block">
          <h3>Work Instruction (WI)</h3>
          <ul v-if="wiDocs.length" class="doc-file-list">
            <li v-for="d in wiDocs" :key="d.id"><a :href="d.file_url" target="_blank">{{ d.file_name }}</a></li>
          </ul>
          <label class="upload-chip">
            {{ uploadingWI ? "Uploading…" : "+ Upload WI" }}
            <input type="file" hidden @change="uploadWI" />
          </label>
        </section>

        <footer class="modal-footer">
          <button class="primary" @click="submitForReview" :disabled="saving">
            {{ saving ? "Submitting…" : "Submit for Final Review" }}
          </button>
        </footer>
        <p v-if="formError" class="error">{{ formError }}</p>
      </div>
    </div>

    <!-- ==================== FINAL REVIEW MODAL (2.3.4) ==================== -->
    <div v-if="reviewingMO" class="modal-backdrop" @click.self="reviewingMO = null">
      <div class="modal">
        <header class="modal-header">
          <span class="mo-no">{{ reviewingMO.mo_no }} — {{ reviewingMO.part_name }}</span>
          <button class="icon-btn" @click="reviewingMO = null">✕</button>
        </header>

        <section class="info-block">
          <h3>Process Sequence</h3>
          <table class="inner-table">
            <thead><tr><th>#</th><th>Process</th><th>Image</th><th>Remarks</th></tr></thead>
            <tbody>
              <tr v-for="s in viewSteps" :key="s.id">
                <td>{{ s.step_no }}</td>
                <td>{{ s.process_name }}</td>
                <td><a v-if="s.process_image_url" :href="s.process_image_url" target="_blank">View</a><span v-else>-</span></td>
                <td>{{ s.remarks || "-" }}</td>
              </tr>
              <tr v-if="viewSteps.length === 0"><td colspan="4" class="empty">No process steps recorded.</td></tr>
            </tbody>
          </table>
        </section>

        <section class="info-block">
          <h3>Required Items</h3>
          <table class="inner-table">
            <thead><tr><th>Category</th><th>Item</th><th>Qty</th></tr></thead>
            <tbody>
              <tr v-for="r in viewRequiredItems" :key="r.id">
                <td>{{ categoryLabel(r.category) }}</td>
                <td>{{ r.inventory_items?.item_name || r.item_name_freeform }}</td>
                <td>{{ r.quantity }}</td>
              </tr>
              <tr v-if="viewRequiredItems.length === 0"><td colspan="3" class="empty">None specified.</td></tr>
            </tbody>
          </table>
        </section>

        <section class="info-block">
          <h3>Work Instruction</h3>
          <ul v-if="viewWiDocs.length" class="doc-file-list">
            <li v-for="d in viewWiDocs" :key="d.id"><a :href="d.file_url" target="_blank">{{ d.file_name }}</a></li>
          </ul>
          <p v-else class="doc-empty-text">No WI uploaded.</p>
        </section>

        <section class="info-block">
          <label>Review Remarks</label>
          <textarea v-model="reviewRemarks" rows="2" placeholder="Optional — required if sending back"></textarea>
        </section>

        <footer class="modal-footer">
          <button class="danger" @click="sendBackToDevelopment" :disabled="saving">Send Back</button>
          <button class="primary" @click="approveFinal" :disabled="saving">
            {{ saving ? "Sending…" : "Approve — Send to PP" }}
          </button>
        </footer>
        <p v-if="formError" class="error">{{ formError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader.vue";

const tab = ref("development");
const loading = ref(true);
const developmentMOs = ref([]);
const reviewMOs = ref([]);
const rawMaterials = ref([]);
const toolingItems = ref([]);
const gaugeItems = ref([]);

const editing = ref(null);
const saving = ref(false);
const formError = ref(null);
const wiDocs = ref([]);
const uploadingWI = ref(false);
const form = reactive({ steps: [], materials: [], tooling: [], gauges: [] });

const requestSaving = ref(false);
const requestConfirmation = ref("");
const requestedItems = ref([]);

const reviewingMO = ref(null);
const viewSteps = ref([]);
const viewRequiredItems = ref([]);
const viewWiDocs = ref([]);
const reviewRemarks = ref("");

function categoryLabel(c) {
  if (c === "RAW_MATERIAL") return "Raw Material";
  if (c === "TOOLING") return "Tooling";
  if (c === "GAUGE") return "Gauge";
  return c;
}
function reqStatusLabel(s) {
  if (s === "PENDING") return "Pending";
  if (s === "PREPARED") return "Prepared";
  if (s === "IN_PROGRESS") return "Under Procurement";
  return "Done";
}
function reqStatusClass(s) {
  if (s === "PENDING") return "grey";
  if (s === "PREPARED") return "blue";
  if (s === "IN_PROGRESS") return "amber";
  return "green";
}

async function loadMOs() {
  loading.value = true;
  const [devRes, reviewRes] = await Promise.all([
    supabase.from("manufacturing_orders").select("*").eq("status", "DEVELOPMENT").order("created_at"),
    supabase.from("manufacturing_orders").select("*").eq("status", "FINAL_REVIEW").order("created_at"),
  ]);
  developmentMOs.value = devRes.data ?? [];
  reviewMOs.value = reviewRes.data ?? [];
  loading.value = false;
}

async function loadInventory() {
  const { data } = await supabase.from("inventory_items").select("id, item_name, category");
  rawMaterials.value = (data ?? []).filter((i) => i.category === "RAW_MATERIAL");
  toolingItems.value = (data ?? []).filter((i) => i.category === "TOOLING");
  gaugeItems.value = (data ?? []).filter((i) => i.category === "GAUGE");
}

async function openUpdate(mo) {
  editing.value = mo;
  formError.value = null;
  const [stepsRes, itemsRes, docsRes] = await Promise.all([
    supabase.from("mo_process_steps").select("*").eq("manufacturing_order_id", mo.id).order("step_no"),
    supabase.from("mo_required_items").select("*").eq("manufacturing_order_id", mo.id),
    supabase.from("documents").select("*").eq("owner_type", "MANUFACTURING_ORDER").eq("owner_id", mo.id).eq("doc_type", "WORK_INSTRUCTION"),
  ]);
  form.steps = (stepsRes.data ?? []).map((s) => ({ ...s, uploading: false }));
  if (form.steps.length === 0) form.steps.push({ process_name: "", remarks: "", process_image_url: "", uploading: false });
  form.materials = (itemsRes.data ?? []).filter((i) => i.category === "RAW_MATERIAL");
  form.tooling = (itemsRes.data ?? []).filter((i) => i.category === "TOOLING");
  form.gauges = (itemsRes.data ?? []).filter((i) => i.category === "GAUGE");
  wiDocs.value = docsRes.data ?? [];
  requestConfirmation.value = "";
  await loadRequestedItems();
}

async function loadRequestedItems() {
  if (!editing.value) return;
  const { data } = await supabase
    .from("procurement_requests")
    .select("*, inventory_items(item_name, category)")
    .eq("manufacturing_order_id", editing.value.id)
    .order("created_at", { ascending: false });
  requestedItems.value = data ?? [];
}

async function sendRequestsToSCM() {
  const candidates = [
    ...form.materials.filter((m) => m.inventory_item_id).map((m) => ({ ...m, category: "RAW_MATERIAL" })),
    ...form.tooling.filter((m) => m.inventory_item_id).map((m) => ({ ...m, category: "TOOLING" })),
    ...form.gauges.filter((m) => m.inventory_item_id).map((m) => ({ ...m, category: "GAUGE" })),
  ];
  if (candidates.length === 0) {
    requestConfirmation.value = "Add at least one required item first.";
    return;
  }

  // Skip items already requested for this MO
  const alreadyRequested = new Set(requestedItems.value.map((r) => r.inventory_item_id));
  const newRows = candidates
    .filter((c) => !alreadyRequested.has(c.inventory_item_id))
    .map((c) => ({
      inventory_item_id: c.inventory_item_id,
      number_requested: c.quantity,
      status: "PENDING",
      manufacturing_order_id: editing.value.id,
      part_no: editing.value.part_number,
      part_name: editing.value.part_name,
      remarks: `Requested by Engineering for MO ${editing.value.mo_no}`,
    }));

  if (newRows.length === 0) {
    requestConfirmation.value = "All required items have already been requested.";
    return;
  }

  requestSaving.value = true;
  requestConfirmation.value = "";
  const { error: err } = await supabase.from("procurement_requests").insert(newRows);
  requestSaving.value = false;
  if (err) { requestConfirmation.value = "Error: " + err.message; return; }

  requestConfirmation.value = `Sent ${newRows.length} request(s) to SCM.`;
  await loadRequestedItems();
}

async function uploadStepImage(event, step) {
  const file = event.target.files[0];
  if (!file) return;
  step.uploading = true;
  const path = `mo-process-images/${editing.value.id}-${Date.now()}-${file.name}`;
  const { error: err } = await supabase.storage.from("documents").upload(path, file);
  step.uploading = false;
  if (err) { formError.value = err.message; return; }
  const { data } = supabase.storage.from("documents").getPublicUrl(path);
  step.process_image_url = data.publicUrl;
}

async function uploadWI(event) {
  const file = event.target.files[0];
  if (!file) return;
  uploadingWI.value = true;
  const path = `wi/${editing.value.id}-${Date.now()}-${file.name}`;
  const { error: err } = await supabase.storage.from("documents").upload(path, file);
  if (err) { uploadingWI.value = false; formError.value = err.message; return; }
  const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("documents").insert({
    owner_type: "MANUFACTURING_ORDER", owner_id: editing.value.id, doc_type: "WORK_INSTRUCTION",
    file_name: file.name, file_url: urlData.publicUrl, uploaded_by: user?.id,
  });
  uploadingWI.value = false;
  const { data: refreshed } = await supabase.from("documents").select("*").eq("owner_type", "MANUFACTURING_ORDER").eq("owner_id", editing.value.id).eq("doc_type", "WORK_INSTRUCTION");
  wiDocs.value = refreshed ?? [];
}

async function submitForReview() {
  saving.value = true;
  formError.value = null;

  await supabase.from("mo_process_steps").delete().eq("manufacturing_order_id", editing.value.id);
  const stepRows = form.steps.filter((s) => s.process_name).map((s, i) => ({
    manufacturing_order_id: editing.value.id, step_no: i + 1,
    process_name: s.process_name, process_image_url: s.process_image_url || null, remarks: s.remarks || null,
  }));
  if (stepRows.length) await supabase.from("mo_process_steps").insert(stepRows);

  await supabase.from("mo_required_items").delete().eq("manufacturing_order_id", editing.value.id);
  const reqRows = [
    ...form.materials.filter((m) => m.inventory_item_id).map((m) => ({ ...m, category: "RAW_MATERIAL" })),
    ...form.tooling.filter((m) => m.inventory_item_id).map((m) => ({ ...m, category: "TOOLING" })),
    ...form.gauges.filter((m) => m.inventory_item_id).map((m) => ({ ...m, category: "GAUGE" })),
  ].map((r) => ({ manufacturing_order_id: editing.value.id, category: r.category, inventory_item_id: r.inventory_item_id, quantity: r.quantity }));
  if (reqRows.length) await supabase.from("mo_required_items").insert(reqRows);

  const { error: err } = await supabase.from("manufacturing_orders").update({ status: "FINAL_REVIEW" }).eq("id", editing.value.id);
  saving.value = false;
  if (err) { formError.value = err.message; return; }

  editing.value = null;
  loadMOs();
}

async function openReview(mo) {
  reviewingMO.value = mo;
  reviewRemarks.value = "";
  formError.value = null;
  const [stepsRes, itemsRes, docsRes] = await Promise.all([
    supabase.from("mo_process_steps").select("*").eq("manufacturing_order_id", mo.id).order("step_no"),
    supabase.from("mo_required_items").select("*, inventory_items(item_name)").eq("manufacturing_order_id", mo.id),
    supabase.from("documents").select("*").eq("owner_type", "MANUFACTURING_ORDER").eq("owner_id", mo.id).eq("doc_type", "WORK_INSTRUCTION"),
  ]);
  viewSteps.value = stepsRes.data ?? [];
  viewRequiredItems.value = itemsRes.data ?? [];
  viewWiDocs.value = docsRes.data ?? [];
}

async function notifyRole(role, message) {
  const { data: users } = await supabase.from("user_profiles").select("id").eq("role", role).eq("account_status", "ACTIVE");
  if (users?.length) await supabase.from("notifications").insert(users.map((u) => ({ profile_id: u.id, message })));
}

async function approveFinal() {
  saving.value = true;
  formError.value = null;
  const { data: { user } } = await supabase.auth.getUser();
  const { error: err } = await supabase.from("manufacturing_orders").update({
    status: "SENT_TO_PP", reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
    sent_to_pp_at: new Date().toISOString(), review_remarks: reviewRemarks.value || null,
  }).eq("id", reviewingMO.value.id);
  saving.value = false;
  if (err) { formError.value = err.message; return; }
  await notifyRole("PRODUCTION_PLANNER", `MO ${reviewingMO.value.mo_no} approved and ready for planning.`);
  reviewingMO.value = null;
  loadMOs();
}

async function sendBackToDevelopment() {
  if (!reviewRemarks.value.trim()) { formError.value = "Please explain what needs fixing."; return; }
  saving.value = true;
  const { data: { user } } = await supabase.auth.getUser();
  const { error: err } = await supabase.from("manufacturing_orders").update({
    status: "DEVELOPMENT", reviewed_by: user?.id, reviewed_at: new Date().toISOString(), review_remarks: reviewRemarks.value,
  }).eq("id", reviewingMO.value.id);
  saving.value = false;
  if (err) { formError.value = err.message; return; }
  reviewingMO.value = null;
  loadMOs();
}

onMounted(() => { loadMOs(); loadInventory(); });
</script>

<style scoped>
.page { padding: 24px; }
.tabs { display: flex; gap: 4px; margin-bottom: 12px; }
.tabs button { padding: 8px 16px; border: 1px solid #e2e2e2; background: #fff; border-radius: 4px 4px 0 0; cursor: pointer; font-size: 13px; color: #666; }
.tabs button.active { background: #3f51b5; color: #fff; border-color: #3f51b5; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.pill.grey { background: #eee; color: #666; }
.pill.amber { background: #fff8e1; color: #f57f17; }
.pill.blue { background: #e3f2fd; color: #1565c0; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.cat { background: #ede7f6; color: #5e35b1; }
.secondary { background: #eee; color: #333; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.secondary:disabled { opacity: 0.6; cursor: not-allowed; }
.confirm { color: #2e7d32; font-size: 12px; margin-top: 8px; }
.requested-table { margin-top: 12px; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; overflow-y: auto; padding: 24px 0; }
.modal { background: #fff; border-radius: 10px; width: 640px; max-height: 90vh; overflow-y: auto; box-shadow: 0 12px 36px rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid #eee; position: sticky; top: 0; background: #fff; }
.mo-no { font-size: 15px; font-weight: 700; }
.icon-btn { border: none; background: none; font-size: 16px; cursor: pointer; color: #888; }
.info-block { padding: 16px 24px; border-bottom: 1px solid #f2f2f2; }
.info-block:last-of-type { border-bottom: none; }
.info-block h3 { font-size: 12px; text-transform: uppercase; color: #888; margin: 0 0 10px; font-weight: 700; }
.step-row { display: grid; grid-template-columns: 1.4fr auto 1fr auto; gap: 8px; margin-bottom: 8px; align-items: center; }
.req-row { display: grid; grid-template-columns: 1.6fr 90px auto; gap: 8px; margin-bottom: 8px; align-items: center; }
input, select, textarea { padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; width: 100%; }
.link { background: none; border: none; color: #3f51b5; cursor: pointer; font-size: 12px; padding: 0; text-align: left; }
.upload-chip { background: #f0f0f5; color: #3f51b5; padding: 6px 10px; border-radius: 20px; font-size: 11px; cursor: pointer; font-weight: 600; text-align: center; white-space: nowrap; }
.doc-file-list { list-style: none; margin: 0 0 8px; padding: 0; font-size: 12px; }
.doc-file-list a { color: #3f51b5; }
.doc-empty-text { font-size: 12px; color: #aaa; }
.inner-table th, .inner-table td { font-size: 12px; }
label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
.modal-footer { padding: 16px 24px; display: flex; justify-content: flex-end; gap: 10px; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 18px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.danger { background: #fff; color: #c62828; border: 1px solid #ef9a9a; padding: 8px 18px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.primary:disabled, .danger:disabled { opacity: 0.6; cursor: not-allowed; }
.modal .error { padding: 0 24px 16px; color: #c62828; font-size: 13px; }
</style>