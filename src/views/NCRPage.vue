<template>
  <div class="page">
    <div class="page-header">
      <h1>Non-Conformance Report (NCR)</h1>
      <button class="primary" @click="showCreate = !showCreate">
        {{ showCreate ? "Cancel" : "New NCR" }}
      </button>
    </div>

    <form v-if="showCreate" class="card form-grid" @submit.prevent="createNCR">
      <div><label>NCR No</label><input v-model="form.ncr_no" required /></div>
      <div><label>Date</label><input v-model="form.ncr_date" type="date" required /></div>
      <div><label>Part / Material</label><input v-model="form.part_name" required /></div>
      <div><label>Inspection Type</label>
        <select v-model="form.inspection_type"><option>IQC</option><option>IPQC</option><option>OQC</option></select>
      </div>
      <div><label>Quantity Affected</label><input v-model.number="form.qty_affected" type="number" /></div>
      <div><label>Responsible Department</label><input v-model="form.responsible_department" /></div>
      <div class="span-2"><label>Non-Conformance Description</label><input v-model="form.non_conformance" required /></div>
      <div class="span-2"><label>Defect Details</label><textarea v-model="form.defect_details" rows="2"></textarea></div>
      <div class="span-2">
        <button class="primary" type="submit" :disabled="saving">{{ saving ? "Saving…" : "Create NCR" }}</button>
      </div>
      <p v-if="formError" class="error span-2">{{ formError }}</p>
    </form>

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <table v-else>
        <thead><tr><th>NCR No</th><th>Date</th><th>Part / Material</th><th>Inspection Type</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="n in ncrs" :key="n.id">
            <td>{{ n.ncr_no }}</td>
            <td>{{ n.ncr_date }}</td>
            <td>{{ n.part_name }}</td>
            <td>{{ n.inspection_type || "-" }}</td>
            <td><span class="pill" :class="statusClass(n.status)">{{ n.status }}</span></td>
            <td><a href="#" @click.prevent="openDetail(n)">View</a></td>
          </tr>
          <tr v-if="ncrs.length === 0"><td colspan="6" class="empty">No NCRs recorded.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- DETAIL + TIMELINE -->
    <div v-if="selected" class="modal-backdrop" @click.self="selected = null">
      <div class="modal">
        <h2>{{ selected.ncr_no }} — {{ selected.part_name }}</h2>
        <dl>
          <dt>Non-Conformance</dt><dd>{{ selected.non_conformance }}</dd>
          <dt>Defect Details</dt><dd>{{ selected.defect_details || "-" }}</dd>
          <dt>Qty Affected</dt><dd>{{ selected.qty_affected || "-" }}</dd>
          <dt>Responsible Dept</dt><dd>{{ selected.responsible_department || "-" }}</dd>
          <dt>Corrective Action</dt><dd>{{ selected.corrective_action || "-" }}</dd>
          <dt>Re-inspection Result</dt><dd>{{ selected.reinspection_result || "-" }}</dd>
          <dt>Status</dt><dd><span class="pill" :class="statusClass(selected.status)">{{ selected.status }}</span></dd>
        </dl>

        <h3>Timeline</h3>
        <ul class="timeline">
          <li v-for="t in timeline" :key="t.id">
            <strong>{{ t.stage.replace('_', ' ') }}</strong> — {{ new Date(t.created_at).toLocaleString() }}
            <p v-if="t.note">{{ t.note }}</p>
          </li>
          <li v-if="timeline.length === 0" class="empty">No timeline entries yet.</li>
        </ul>

        <div class="add-stage">
          <select v-model="newStage">
            <option v-for="s in stages" :key="s" :value="s">{{ s.replace('_', ' ') }}</option>
          </select>
          <input v-model="newNote" placeholder="Note (optional)" />
          <button @click="addTimelineEntry" :disabled="saving">Add</button>
        </div>

        <button @click="selected = null">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const ncrs = ref([]);
const loading = ref(true);
const showCreate = ref(false);
const saving = ref(false);
const formError = ref(null);

const selected = ref(null);
const timeline = ref([]);
const newStage = ref("INVESTIGATION");
const newNote = ref("");
const stages = ["ISSUE_IDENTIFIED", "REPORT_CREATED", "INVESTIGATION", "CORRECTIVE_ACTION", "REVIEW", "REINSPECTION", "CLOSED"];

const form = reactive({
  ncr_no: "", ncr_date: new Date().toISOString().slice(0, 10), part_name: "",
  inspection_type: "IQC", qty_affected: null, responsible_department: "",
  non_conformance: "", defect_details: "",
});

function statusClass(s) {
  if (s === "CLOSED") return "green";
  if (s === "PENDING_INSPECTION") return "amber";
  return "red";
}

async function loadNCRs() {
  loading.value = true;
  const { data } = await supabase.from("ncr_records").select("*").order("ncr_date", { ascending: false });
  ncrs.value = data ?? [];
  loading.value = false;
}

async function createNCR() {
  saving.value = true;
  formError.value = null;
  const { data: { user } } = await supabase.auth.getUser();
  const { data: ncr, error: err } = await supabase.from("ncr_records").insert({ ...form, raised_by: user?.id }).select().single();
  if (err) { saving.value = false; formError.value = err.message; return; }

  await supabase.from("ncr_timeline").insert({ ncr_id: ncr.id, stage: "REPORT_CREATED", created_by: user?.id });

  saving.value = false;
  showCreate.value = false;
  Object.assign(form, { ncr_no: "", ncr_date: new Date().toISOString().slice(0, 10), part_name: "", inspection_type: "IQC", qty_affected: null, responsible_department: "", non_conformance: "", defect_details: "" });
  loadNCRs();
}

async function openDetail(n) {
  selected.value = n;
  const { data } = await supabase.from("ncr_timeline").select("*").eq("ncr_id", n.id).order("created_at");
  timeline.value = data ?? [];
}

async function addTimelineEntry() {
  saving.value = true;
  const { data: { user } } = await supabase.auth.getUser();
  const { error: err } = await supabase.from("ncr_timeline").insert({ ncr_id: selected.value.id, stage: newStage.value, note: newNote.value || null, created_by: user?.id });
  if (!err && newStage.value === "CLOSED") {
    await supabase.from("ncr_records").update({ status: "CLOSED" }).eq("id", selected.value.id);
  }
  saving.value = false;
  newNote.value = "";
  await openDetail(selected.value);
  loadNCRs();
}

onMounted(loadNCRs);
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h1 { font-size: 20px; margin: 0; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.red { background: #ffebee; color: #c62828; }
.pill.amber { background: #fff8e1; color: #f57f17; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.error { color: #c62828; font-size: 13px; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; padding: 24px; border-radius: 8px; width: 480px; max-height: 85vh; overflow-y: auto; }
.modal dl { display: grid; grid-template-columns: 140px 1fr; row-gap: 8px; font-size: 13px; margin-bottom: 16px; }
.modal dt { color: #888; }
.modal h3 { font-size: 13px; margin: 12px 0 8px; }
.timeline { list-style: none; padding: 0; margin: 0 0 12px; font-size: 12px; }
.timeline li { border-left: 2px solid #3f51b5; padding: 4px 0 4px 12px; margin-bottom: 8px; }
.timeline p { margin: 2px 0 0; color: #666; }
.add-stage { display: flex; gap: 8px; margin-bottom: 12px; }
</style>