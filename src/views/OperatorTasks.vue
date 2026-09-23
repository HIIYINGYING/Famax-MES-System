<template>
  <div class="page">
    <h1>My Tasks</h1>

    <div class="tabs">
      <button :class="{ active: tab === 'ongoing' }" @click="tab = 'ongoing'">Ongoing Task</button>
      <button :class="{ active: tab === 'scheduled' }" @click="tab = 'scheduled'">Scheduled Task</button>
      <button :class="{ active: tab === 'completed' }" @click="tab = 'completed'">Completed Tasks</button>
    </div>

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="loadError" class="error">{{ loadError }}</div>
      <table v-else>
        <thead>
          <tr>
            <th>MO No</th><th>Part Name</th><th>Process</th><th>Machine</th>
            <th v-if="tab === 'scheduled'">Priority</th>
            <th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in filteredTasks" :key="t.id">
            <td>{{ t.process_plans?.order_no }}</td>
            <td>{{ t.process_plans?.part_name }}</td>
            <td>{{ t.process_name }}</td>
            <td>{{ t.machines?.name || "-" }}</td>
            <td v-if="tab === 'scheduled'"><span class="pill" :class="priorityClass(t.priority)">{{ t.priority || "NORMAL" }}</span></td>
            <td><span class="pill" :class="statusClass(t.status)">{{ t.status }}</span></td>
            <td>
              <button v-if="tab === 'scheduled'" class="link" @click="acceptTask(t)">Accept</button>
              <button v-else class="link" @click="openTask(t)">Open</button>
            </td>
          </tr>
          <tr v-if="filteredTasks.length === 0"><td colspan="7" class="empty">No tasks here.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- TASK DETAIL / WORKFLOW MODAL -->
    <div v-if="selected" class="modal-backdrop" @click.self="selected = null">
      <div class="modal">
        <h2>{{ selected.process_plans?.part_name }} — {{ selected.process_name }}</h2>
        <p class="sub">MO: {{ selected.process_plans?.order_no }} · Machine: {{ selected.machines?.name || "-" }} · Qty: {{ selected.process_plans?.quantity }}</p>

        <!-- Step 1: checklist before setup -->
        <div v-if="selected.status === 'ACCEPTED'" class="section">
          <h3>Machine Setup Checklist</h3>
          <label class="check"><input type="checkbox" v-model="checklist.materials" /> Materials ready</label>
          <label class="check"><input type="checkbox" v-model="checklist.tooling" /> Tooling ready</label>
          <label class="check"><input type="checkbox" v-model="checklist.gauges" /> Gauges ready</label>
          <label class="check"><input type="checkbox" v-model="checklist.safety" /> Safety requirements met</label>
          <button class="primary" :disabled="!allChecked || saving" @click="startSetup">
            {{ saving ? "Starting…" : "Start Machine Setup" }}
          </button>
        </div>

        <!-- Step 2: setup in progress -->
        <div v-if="selected.status === 'SETUP'" class="section">
          <p>Setup started at {{ formatTime(selected.actual_setup_start) }}.</p>
          <button class="primary" :disabled="saving" @click="startProduction">
            {{ saving ? "Starting…" : "Complete Setup & Start Production" }}
          </button>
        </div>

        <!-- Step 3: in progress — cycle time + tooling request + stop -->
        <div v-if="selected.status === 'IN_PROGRESS'" class="section">
          <p>Production started at {{ formatTime(selected.actual_start) }}.</p>
          <label>Actual Cycle Time (min/pc)</label>
          <div class="row">
            <input v-model.number="cycleTime" type="number" step="0.1" />
            <button @click="updateCycleTime" :disabled="saving">Update</button>
          </div>
          <button class="secondary" @click="showToolingRequest = !showToolingRequest">
            Request Material / Tooling / Gauge
          </button>
          <div v-if="showToolingRequest" class="tooling-request">
            <select v-model="toolingItemId">
              <option disabled value="">Select item…</option>
              <option v-for="i in toolingGaugeItems" :key="i.id" :value="i.id">{{ i.item_name }} ({{ categoryLabel(i.category) }})</option>
            </select>
            <input v-model.number="toolingQty" type="number" placeholder="Qty" style="width:80px" />
            <button @click="submitToolingRequest" :disabled="saving">Submit</button>
          </div>
          <button class="danger" @click="stopProduction">Stop Production</button>
        </div>

        <!-- Step 4: stopped — record output then resume or finalize -->
        <div v-if="selected.status === 'STOPPED'" class="section">
          <label>Quantity Produced</label>
          <input v-model.number="stopForm.qty_produced" type="number" />
          <label>Quantity Rejected</label>
          <input v-model.number="stopForm.qty_rejected" type="number" />
          <label>Reject Reason</label>
          <input v-model="stopForm.reject_reason" />
          <div class="modal-actions">
            <button class="secondary" @click="resumeProduction" :disabled="saving">Resume</button>
            <button class="primary" @click="showFinalize = true">Finalize & Complete</button>
          </div>

          <div v-if="showFinalize" class="section">
            <label>Machine Counter Start</label>
            <input v-model.number="stopForm.machine_counter_start" type="number" />
            <label>Machine Counter End</label>
            <input v-model.number="stopForm.machine_counter_end" type="number" />
            <button class="primary" @click="completeTask" :disabled="saving">
              {{ saving ? "Completing…" : "Complete Job" }}
            </button>
          </div>
        </div>

        <div v-if="selected.status === 'COMPLETED'" class="section">
          <p class="done">✓ Job completed at {{ formatTime(selected.actual_end) }}.</p>
          <p>Produced: {{ selected.qty_produced }} · Rejected: {{ selected.qty_rejected }}</p>
        </div>

        <p v-if="formError" class="error">{{ formError }}</p>
        <button class="close" @click="selected = null">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const tab = ref("ongoing");
const tasks = ref([]);
const loading = ref(true);
const selected = ref(null);
const saving = ref(false);
const formError = ref(null);
const loadError = ref(null);
const myId = ref(null);

const checklist = reactive({ materials: false, tooling: false, gauges: false, safety: false });
const allChecked = computed(() => checklist.materials && checklist.tooling && checklist.gauges && checklist.safety);
const cycleTime = ref(null);
const showToolingRequest = ref(false);
const toolingGaugeItems = ref([]);
const toolingItemId = ref("");
const toolingQty = ref(1);
const stopForm = reactive({ qty_produced: null, qty_rejected: null, reject_reason: "", machine_counter_start: null, machine_counter_end: null });
const showFinalize = ref(false);

const filteredTasks = computed(() => {
  if (tab.value === "scheduled") return tasks.value.filter((t) => t.status === "SCHEDULED" && !t.assigned_operator_id);
  if (tab.value === "completed") return tasks.value.filter((t) => t.status === "COMPLETED" && t.assigned_operator_id === myId.value);
  return tasks.value.filter((t) =>
    t.assigned_operator_id === myId.value && !["SCHEDULED", "COMPLETED"].includes(t.status)
  );
});

function statusClass(s) {
  if (s === "COMPLETED") return "green";
  if (s === "IN_PROGRESS" || s === "SETUP") return "blue";
  if (s === "STOPPED") return "red";
  return "grey";
}
function priorityClass(p) {
  if (p === "URGENT") return "red";
  if (p === "HIGH") return "amber";
  return "grey";
}
function formatTime(t) { return t ? new Date(t).toLocaleString() : "-"; }

async function loadTasks() {
  loading.value = true;
  loadError.value = null;
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("Your session has expired. Please sign in again.");
    myId.value = user.id;
    const { data, error: taskError } = await supabase
      .from("process_plan_steps")
      .select("*, machines(name), process_plans(order_no, part_name, quantity)")
      .order("planned_start");
    if (taskError) throw taskError;
    tasks.value = data ?? [];
  } catch (err) {
    loadError.value = err.message || "Unable to load tasks. Please try again.";
  } finally {
    loading.value = false;
  }
}

function categoryLabel(c) {
  if (c === "RAW_MATERIAL") return "Raw Material";
  if (c === "TOOLING") return "Tooling";
  if (c === "GAUGE") return "Gauge";
  return c;
}

async function loadToolingGaugeItems() {
  const { data } = await supabase.from("inventory_items").select("id, item_name, category").in("category", ["RAW_MATERIAL", "TOOLING", "GAUGE"]);
  toolingGaugeItems.value = data ?? [];
}

async function acceptTask(t) {
  formError.value = null;
  const { data, error: err } = await supabase
    .from("process_plan_steps")
    .update({ assigned_operator_id: myId.value, status: "ACCEPTED" })
    .eq("id", t.id)
    .eq("status", "SCHEDULED")
    .is("assigned_operator_id", null)
    .select("id")
    .maybeSingle();
  if (err) {
    loadError.value = err.message;
  } else if (!data) {
    loadError.value = "This task was already accepted by someone else. Refresh the list and choose another task.";
  } else {
    await loadTasks();
  }
}

function openTask(t) {
  selected.value = t;
  formError.value = null;
  cycleTime.value = t.actual_cycle_minutes;
  Object.assign(checklist, { materials: false, tooling: false, gauges: false, safety: false });
  Object.assign(stopForm, { qty_produced: null, qty_rejected: null, reject_reason: "", machine_counter_start: null, machine_counter_end: null });
  showFinalize.value = false;
  showToolingRequest.value = false;
}

async function startSetup() {
  saving.value = true;
  const { error: err } = await supabase.from("process_plan_steps").update({
    status: "SETUP",
    actual_setup_start: new Date().toISOString(),
    checklist_materials_ready: true, checklist_tooling_ready: true,
    checklist_gauges_ready: true, checklist_safety_ready: true,
  }).eq("id", selected.value.id);
  saving.value = false;
  if (err) { formError.value = err.message; return; }
  await refreshSelected();
}

async function startProduction() {
  saving.value = true;
  const { error: err } = await supabase.from("process_plan_steps").update({
    status: "IN_PROGRESS",
    actual_setup_end: new Date().toISOString(),
    actual_start: new Date().toISOString(),
  }).eq("id", selected.value.id);
  saving.value = false;
  if (err) { formError.value = err.message; return; }
  await refreshSelected();
}

async function updateCycleTime() {
  saving.value = true;
  const { error: err } = await supabase.from("process_plan_steps").update({ actual_cycle_minutes: cycleTime.value }).eq("id", selected.value.id);
  saving.value = false;
  if (err) formError.value = err.message;
}

async function loadToolingGaugeItemsIfNeeded() {
  if (toolingGaugeItems.value.length === 0) await loadToolingGaugeItems();
}

async function submitToolingRequest() {
  if (!toolingItemId.value || !Number.isFinite(toolingQty.value) || toolingQty.value <= 0) {
    formError.value = "Select an item and enter a quantity greater than zero.";
    return;
  }
  saving.value = true;
  formError.value = null;
  const { error: err } = await supabase.from("procurement_requests").insert({
    inventory_item_id: toolingItemId.value,
    number_requested: toolingQty.value,
    status: "PENDING",
    requested_by: myId.value,
    remarks: "Requested by operator during production",
  });
  saving.value = false;
  if (err) { formError.value = err.message; return; }
  showToolingRequest.value = false;
  toolingItemId.value = "";
  toolingQty.value = 1;
}

async function stopProduction() {
  saving.value = true;
  const { error: err } = await supabase.from("process_plan_steps").update({ status: "STOPPED" }).eq("id", selected.value.id);
  saving.value = false;
  if (err) { formError.value = err.message; return; }
  await refreshSelected();
}

async function resumeProduction() {
  if (!validStopQuantities()) return;
  saving.value = true;
  const { error: err } = await supabase.from("process_plan_steps").update({
    status: "IN_PROGRESS",
    qty_produced: stopForm.qty_produced,
    qty_rejected: stopForm.qty_rejected,
    reject_reason: stopForm.reject_reason || null,
  }).eq("id", selected.value.id);
  saving.value = false;
  if (err) { formError.value = err.message; return; }
  await refreshSelected();
}

async function completeTask() {
  if (!validStopQuantities()) return;
  if (stopForm.machine_counter_start == null || stopForm.machine_counter_end == null ||
      stopForm.machine_counter_start < 0 || stopForm.machine_counter_end < stopForm.machine_counter_start) {
    formError.value = "Enter valid machine counters. The end counter must be at least the start counter.";
    return;
  }
  saving.value = true;
  const { error: err } = await supabase.from("process_plan_steps").update({
    status: "COMPLETED",
    actual_end: new Date().toISOString(),
    qty_produced: stopForm.qty_produced,
    qty_rejected: stopForm.qty_rejected,
    reject_reason: stopForm.reject_reason || null,
    machine_counter_start: stopForm.machine_counter_start,
    machine_counter_end: stopForm.machine_counter_end,
  }).eq("id", selected.value.id);
  saving.value = false;
  if (err) { formError.value = err.message; return; }
  await refreshSelected();
  loadTasks();
}

async function refreshSelected() {
  const { data } = await supabase
    .from("process_plan_steps")
    .select("*, machines(name), process_plans(order_no, part_name, quantity)")
    .eq("id", selected.value.id)
    .single();
  if (data) selected.value = data;
  loadTasks();
}

function validStopQuantities() {
  const produced = stopForm.qty_produced;
  const rejected = stopForm.qty_rejected;
  if (!Number.isInteger(produced) || produced < 0 || !Number.isInteger(rejected) || rejected < 0 || rejected > produced) {
    formError.value = "Enter whole, non-negative quantities. Rejected quantity cannot exceed produced quantity.";
    return false;
  }
  return true;
}

onMounted(() => { loadTasks(); loadToolingGaugeItemsIfNeeded(); });
</script>

<style scoped>
.page { padding: 24px; }
.page h1 { font-size: 20px; margin: 0 0 16px; }
.tabs { display: flex; gap: 4px; margin-bottom: 12px; }
.tabs button { padding: 8px 16px; border: 1px solid #e2e2e2; background: #fff; border-radius: 4px 4px 0 0; cursor: pointer; font-size: 13px; color: #666; }
.tabs button.active { background: #3f51b5; color: #fff; border-color: #3f51b5; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.link { background: none; border: none; color: #3f51b5; cursor: pointer; font-size: 13px; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.blue { background: #e3f2fd; color: #1565c0; }
.pill.red { background: #ffebee; color: #c62828; }
.pill.amber { background: #fff8e1; color: #f57f17; }
.pill.grey { background: #eee; color: #777; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; padding: 24px; border-radius: 8px; width: 420px; max-height: 85vh; overflow-y: auto; }
.sub { color: #888; font-size: 12px; margin: 0 0 16px; }
.section { border-top: 1px solid #eee; padding-top: 12px; margin-top: 12px; }
.section h3 { font-size: 13px; margin: 0 0 8px; }
.check { display: block; font-size: 13px; margin-bottom: 6px; }
label { display: block; font-size: 12px; color: #666; margin-top: 8px; margin-bottom: 4px; }
input, select { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
.row { display: flex; gap: 8px; }
.tooling-request { display: flex; gap: 8px; margin: 8px 0; align-items: center; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; margin-top: 8px; }
.primary:disabled { opacity: 0.6; cursor: not-allowed; }
.secondary { background: #eee; color: #333; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; margin-top: 8px; }
.danger { background: #c62828; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; margin-top: 12px; }
.modal-actions { display: flex; gap: 8px; margin-top: 8px; }
.close { background: none; border: 1px solid #ccc; padding: 6px 16px; border-radius: 4px; cursor: pointer; margin-top: 16px; }
.done { color: #2e7d32; font-weight: 600; }
.error { color: #c62828; font-size: 13px; margin-top: 8px; }
</style>
