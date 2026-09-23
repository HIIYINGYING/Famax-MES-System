<template>
  <div class="page">
    <div class="page-header">
      <h1>Process Plan</h1>
      <button class="primary" @click="showCreate = !showCreate">
        {{ showCreate ? "Cancel" : "New Process Plan" }}
      </button>
    </div>

    <!-- CREATE / SCHEDULE A PLAN -->
    <form v-if="showCreate" class="card form-grid" @submit.prevent="createPlan">
      <div>
        <label>Manufacturing Order</label>
        <select v-model="form.mo_id" required @change="onMoSelected">
          <option disabled value="">Select MO…</option>
          <option v-for="mo in mos" :key="mo.id" :value="mo.id">
            {{ mo.mo_no }} — {{ mo.part_name }}
          </option>
        </select>
      </div>
      <div>
        <label>Order No</label>
        <input v-model="form.order_no" disabled />
      </div>
      <div>
        <label>Part No</label>
        <input v-model="form.part_no" disabled />
      </div>
      <div>
        <label>Part Name</label>
        <input v-model="form.part_name" disabled />
      </div>
      <div>
        <label>Quantity</label>
        <input v-model.number="form.quantity" type="number" required />
      </div>
      <div>
        <label>Current Team</label>
        <input v-model="form.current_team" placeholder="e.g. Turning Team" />
      </div>
      <div class="span-2">
        <label>Estimated Completion</label>
        <input v-model="form.estimated_completion" type="datetime-local" />
      </div>

      <div class="span-2">
        <h3>Process Steps</h3>
        <div v-for="(step, i) in form.steps" :key="i" class="step-row">
          <input v-model="step.process_name" placeholder="Process (e.g. Turning 1)" required />
          <select v-model="step.machine_id">
            <option value="">No machine</option>
            <option v-for="m in machines" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
          <input v-model="step.planned_start" type="datetime-local" />
          <input v-model="step.planned_end" type="datetime-local" />
          <button type="button" class="link" @click="form.steps.splice(i, 1)">Remove</button>
        </div>
        <button type="button" class="link" @click="addStep">+ Add Process Step</button>
      </div>

      <div class="span-2">
        <button class="primary" type="submit" :disabled="saving">
          {{ saving ? "Saving…" : "Save Plan" }}
        </button>
      </div>
      <p v-if="formError" class="error span-2">{{ formError }}</p>
    </form>

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <table v-else>
        <thead>
          <tr><th>Order Date</th><th>Order No</th><th>Part No</th><th>Part Name</th><th>Quantity</th><th>Current Team</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="p in plans" :key="p.id">
            <td>{{ p.created_at?.slice(0,10) }}</td>
            <td>{{ p.order_no }}</td>
            <td>{{ p.part_no }}</td>
            <td>{{ p.part_name }}</td>
            <td>{{ p.quantity }} PCS</td>
            <td>{{ p.current_team || "-" }}</td>
            <td><span class="pill" :class="statusClass(p.status)">{{ p.status }}</span></td>
            <td><a href="#" @click.prevent="openPlan(p)">View</a></td>
          </tr>
          <tr v-if="plans.length === 0"><td colspan="8" class="empty">No process plans yet.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- VIEW: planned vs actual for one plan -->
    <div v-if="selected" class="modal-backdrop" @click.self="selected = null">
      <div class="modal">
        <h2>{{ selected.order_no }} — {{ selected.part_name }}</h2>
        <p class="sub">Planned vs Actual</p>

        <div v-if="viewSteps.length === 0" class="empty">No steps recorded for this plan.</div>

        <table v-else class="steps">
          <thead><tr><th>Process</th><th>Planned</th><th>Actual</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="s in viewSteps" :key="s.id">
              <td>{{ s.process_name }}</td>
              <td>{{ formatRange(s.planned_start, s.planned_end) }}</td>
              <td>{{ formatRange(s.actual_start, s.actual_end) }}</td>
              <td><span class="pill" :class="statusClass(s.status)">{{ s.status }}</span></td>
            </tr>
          </tbody>
        </table>

        <button @click="selected = null">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const plans = ref([]);
const mos = ref([]);
const machines = ref([]);
const loading = ref(true);
const error = ref(null);

const selected = ref(null);
const viewSteps = ref([]);

const showCreate = ref(false);
const saving = ref(false);
const formError = ref(null);
const form = reactive({
  mo_id: "", order_no: "", part_no: "", part_name: "", quantity: 0,
  current_team: "", estimated_completion: "",
  steps: [{ process_name: "", machine_id: "", planned_start: "", planned_end: "" }],
});

function formatRange(start, end) {
  if (!start) return "-";
  const s = new Date(start).toLocaleDateString();
  const e = end ? new Date(end).toLocaleDateString() : "…";
  return `${s} → ${e}`;
}

function statusClass(s) {
  if (s === "COMPLETED") return "green";
  if (s === "IN_PROGRESS") return "blue";
  if (s === "NCR_HOLD" || s === "DELAYED") return "red";
  return "grey";
}

function addStep() {
  form.steps.push({ process_name: "", machine_id: "", planned_start: "", planned_end: "" });
}

function onMoSelected() {
  const mo = mos.value.find((m) => m.id === form.mo_id);
  if (!mo) return;
  form.order_no = mo.sales_orders?.order_no || "";
  form.part_no = mo.part_number;
  form.part_name = mo.part_name;
  form.quantity = mo.quantity;
}

async function loadPlans() {
  loading.value = true;
  const { data, error: err } = await supabase
    .from("process_plans").select("*").order("created_at", { ascending: false });
  if (err) error.value = err.message;
  else plans.value = data;
  loading.value = false;
}

async function loadReferenceData() {
  const [moRes, machineRes] = await Promise.all([
    supabase.from("manufacturing_orders").select("id, mo_no, part_number, part_name, quantity, sales_orders(order_no)"),
    supabase.from("machines").select("id, name").order("name"),
  ]);
  mos.value = moRes.data ?? [];
  machines.value = machineRes.data ?? [];
}

async function openPlan(plan) {
  selected.value = plan;
  const { data } = await supabase
    .from("process_plan_steps").select("*").eq("process_plan_id", plan.id).order("step_no");
  viewSteps.value = data ?? [];
}

async function createPlan() {
  saving.value = true;
  formError.value = null;

  const { data: plan, error: planErr } = await supabase
    .from("process_plans")
    .insert({
      manufacturing_order_id: form.mo_id,
      order_no: form.order_no,
      part_no: form.part_no,
      part_name: form.part_name,
      quantity: form.quantity,
      current_team: form.current_team || null,
      estimated_completion: form.estimated_completion || null,
    })
    .select()
    .single();

  if (planErr) {
    saving.value = false;
    formError.value = planErr.message;
    return;
  }

  const stepRows = form.steps
    .filter((s) => s.process_name)
    .map((s, i) => ({
      process_plan_id: plan.id,
      step_no: i + 1,
      process_name: s.process_name,
      machine_id: s.machine_id || null,
      planned_start: s.planned_start || null,
      planned_end: s.planned_end || null,
    }));

  if (stepRows.length > 0) {
    const { error: stepsErr } = await supabase.from("process_plan_steps").insert(stepRows);
    if (stepsErr) {
      saving.value = false;
      formError.value = stepsErr.message;
      return;
    }
  }

  saving.value = false;
  showCreate.value = false;
  Object.assign(form, {
    mo_id: "", order_no: "", part_no: "", part_name: "", quantity: 0,
    current_team: "", estimated_completion: "",
    steps: [{ process_name: "", machine_id: "", planned_start: "", planned_end: "" }],
  });
  loadPlans();
}

onMounted(() => {
  loadPlans();
  loadReferenceData();
});
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h1 { font-size: 20px; margin: 0; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
input, select { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
input:disabled { background: #f5f5f5; color: #888; }
h3 { font-size: 13px; margin: 8px 0; }
.step-row { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr auto; gap: 8px; margin-bottom: 8px; align-items: center; }
.link { background: none; border: none; color: #3f51b5; cursor: pointer; font-size: 12px; padding: 0; text-align: left; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.error { color: #c62828; font-size: 13px; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.primary:disabled { opacity: 0.6; cursor: not-allowed; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; padding: 24px; border-radius: 8px; width: 560px; max-height: 85vh; overflow-y: auto; }
.sub { color: #888; font-size: 12px; margin: 0 0 12px; }
.steps th, .steps td { font-size: 12px; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.blue { background: #e3f2fd; color: #1565c0; }
.pill.red { background: #ffebee; color: #c62828; }
.pill.grey { background: #eee; color: #777; }
</style>