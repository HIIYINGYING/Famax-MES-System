<template>
  <div class="page">
    <PageHeader title="Customer Management" subtitle="Create, view, and maintain customer records">
      <template #actions>
        <button class="primary" @click="showCreate = !showCreate">
          {{ showCreate ? "Cancel" : "New Customer" }}
        </button>
      </template>
    </PageHeader>

    <!-- Create form -->
    <form v-if="showCreate" class="card form-grid" @submit.prevent="createCustomer">
      <div>
        <label>Customer Code</label>
        <input v-model="form.customer_code" required />
      </div>
      <div>
        <label>Status</label>
        <select v-model="form.status">
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>
      <div class="span-2">
        <label>Customer Name</label>
        <input v-model="form.customer_name" required />
      </div>
      <div class="span-2">
        <label>Location</label>
        <input v-model="form.location" />
      </div>
      <div>
        <label>Contact Number</label>
        <input v-model="form.contact_number" />
      </div>
      <div>
        <label>Contact Person Name</label>
        <input v-model="form.contact_person_name" />
      </div>
      <div>
        <label>Contact Number (Person)</label>
        <input v-model="form.contact_person_number" />
      </div>
      <div>
        <label>Email</label>
        <input v-model="form.email" type="email" />
      </div>
      <div class="span-2">
        <button class="primary" type="submit" :disabled="saving">
          {{ saving ? "Saving…" : "Save Customer" }}
        </button>
      </div>
      <p v-if="formError" class="error span-2">{{ formError }}</p>
    </form>

    <div class="card">
      <input class="search" v-model="search" placeholder="Search by name or code…" />

      <div v-if="loading" class="loading">Loading customers…</div>
      <div v-else-if="error" class="error">{{ error }}</div>

      <table v-else>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Address</th>
            <th>Contact</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in filteredCustomers" :key="c.id">
            <td>{{ c.customer_code }}</td>
            <td>{{ c.customer_name }}</td>
            <td>{{ c.location }}</td>
            <td>{{ c.contact_number }}</td>
            <td>
              <span class="pill" :class="c.status === 'ACTIVE' ? 'green' : 'grey'">{{ c.status }}</span>
            </td>
            <td><a href="#" @click.prevent="openDetail(c)">View</a></td>
          </tr>
          <tr v-if="filteredCustomers.length === 0">
            <td colspan="6" class="empty">No customers found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ==================== DETAIL / EDIT / ORDER HISTORY MODAL ==================== -->
    <div v-if="selected" class="modal-backdrop" @click.self="closeDetail">
      <div class="modal">
        <header class="modal-header">
          <span class="cust-name">{{ selected.customer_name }}</span>
          <button class="icon-btn" @click="closeDetail">✕</button>
        </header>

        <section class="info-block">
          <div class="section-title-row">
            <h3>Customer Details</h3>
            <button v-if="!editing" class="link" @click="startEdit">Update Details</button>
          </div>

          <div v-if="!editing" class="info-grid">
            <div><span class="k">Code</span><span class="v">{{ selected.customer_code }}</span></div>
            <div><span class="k">Status</span><span class="v">{{ selected.status }}</span></div>
            <div><span class="k">Location</span><span class="v">{{ selected.location || "-" }}</span></div>
            <div><span class="k">Contact Number</span><span class="v">{{ selected.contact_number || "-" }}</span></div>
            <div><span class="k">Contact Person</span><span class="v">{{ selected.contact_person_name || "-" }}</span></div>
            <div><span class="k">Contact Number (Person)</span><span class="v">{{ selected.contact_person_number || "-" }}</span></div>
            <div><span class="k">Email</span><span class="v">{{ selected.email || "-" }}</span></div>
          </div>

          <form v-else class="form-grid" @submit.prevent="saveEdit">
            <div><label>Customer Name</label><input v-model="editForm.customer_name" required /></div>
            <div><label>Status</label>
              <select v-model="editForm.status"><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select>
            </div>
            <div class="span-2"><label>Location</label><input v-model="editForm.location" /></div>
            <div><label>Contact Number</label><input v-model="editForm.contact_number" /></div>
            <div><label>Contact Person Name</label><input v-model="editForm.contact_person_name" /></div>
            <div><label>Contact Number (Person)</label><input v-model="editForm.contact_person_number" /></div>
            <div><label>Email</label><input v-model="editForm.email" type="email" /></div>
            <div class="span-2 edit-actions">
              <button type="button" class="secondary" @click="editing = false">Cancel</button>
              <button type="submit" class="primary" :disabled="saving">{{ saving ? "Saving…" : "Save Changes" }}</button>
            </div>
          </form>
          <p v-if="formError" class="error">{{ formError }}</p>
        </section>

        <section class="info-block">
          <h3>Order History</h3>
          <table class="inner-table">
            <thead><tr><th>Order No</th><th>Order Date</th><th>Due Date</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="o in orderHistory" :key="o.id">
                <td>{{ o.order_no }}</td>
                <td>{{ o.order_date }}</td>
                <td>{{ o.due_date || "-" }}</td>
                <td><span class="pill">{{ o.status }}</span></td>
              </tr>
              <tr v-if="orderHistory.length === 0"><td colspan="4" class="empty">No orders placed yet.</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader.vue";

const customers = ref([]);
const loading = ref(true);
const error = ref(null);
const search = ref("");
const selected = ref(null);
const orderHistory = ref([]);
const editing = ref(false);
const editForm = reactive({});

const showCreate = ref(false);
const saving = ref(false);
const formError = ref(null);
const form = reactive({
  customer_code: "",
  customer_name: "",
  location: "",
  contact_number: "",
  contact_person_name: "",
  contact_person_number: "",
  email: "",
  status: "ACTIVE",
});

const filteredCustomers = computed(() => {
  if (!search.value.trim()) return customers.value;
  const q = search.value.toLowerCase();
  return customers.value.filter(
    (c) => c.customer_name.toLowerCase().includes(q) || c.customer_code.toLowerCase().includes(q)
  );
});

async function loadCustomers() {
  loading.value = true;
  error.value = null;
  const { data, error: err } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });
  if (err) error.value = err.message;
  else customers.value = data;
  loading.value = false;
}

async function createCustomer() {
  saving.value = true;
  formError.value = null;
  const { error: err } = await supabase.from("customers").insert({ ...form });
  saving.value = false;
  if (err) {
    formError.value = err.message;
    return;
  }
  showCreate.value = false;
  Object.assign(form, {
    customer_code: "", customer_name: "", location: "", contact_number: "",
    contact_person_name: "", contact_person_number: "", email: "", status: "ACTIVE",
  });
  loadCustomers();
}

async function openDetail(c) {
  selected.value = c;
  editing.value = false;
  formError.value = null;
  const { data } = await supabase
    .from("sales_orders")
    .select("id, order_no, order_date, due_date, status")
    .eq("customer_id", c.id)
    .order("order_date", { ascending: false });
  orderHistory.value = data ?? [];
}

function closeDetail() {
  selected.value = null;
}

function startEdit() {
  Object.assign(editForm, { ...selected.value });
  editing.value = true;
  formError.value = null;
}

async function saveEdit() {
  saving.value = true;
  formError.value = null;
  const { error: err } = await supabase.from("customers").update({
    customer_name: editForm.customer_name,
    location: editForm.location,
    contact_number: editForm.contact_number,
    contact_person_name: editForm.contact_person_name,
    contact_person_number: editForm.contact_person_number,
    email: editForm.email,
    status: editForm.status,
    updated_at: new Date().toISOString(),
  }).eq("id", selected.value.id);
  saving.value = false;
  if (err) { formError.value = err.message; return; }

  Object.assign(selected.value, editForm);
  editing.value = false;
  loadCustomers();
}

onMounted(loadCustomers);
</script>

<style scoped>
.page { padding: 24px; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
input, select { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
.search { margin-bottom: 12px; max-width: 300px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: #e8edff; color: #3f51b5; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.grey { background: #eee; color: #777; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.primary:disabled { opacity: 0.6; cursor: not-allowed; }
.secondary { background: #eee; color: #333; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.link { background: none; border: none; color: #3f51b5; cursor: pointer; font-size: 12px; padding: 0; }
.error { color: #c62828; font-size: 13px; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; overflow-y: auto; padding: 24px 0; }
.modal { background: #fff; border-radius: 10px; width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 12px 36px rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #eee; position: sticky; top: 0; background: #fff; }
.cust-name { font-size: 16px; font-weight: 700; }
.icon-btn { border: none; background: none; font-size: 16px; cursor: pointer; color: #888; }
.info-block { padding: 16px 24px; border-bottom: 1px solid #f2f2f2; }
.info-block:last-of-type { border-bottom: none; }
.section-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.info-block h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin: 0; font-weight: 700; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.info-grid .k { display: block; font-size: 11px; color: #999; }
.info-grid .v { display: block; font-size: 14px; font-weight: 500; }
.edit-actions { display: flex; justify-content: flex-end; gap: 8px; }
.inner-table th, .inner-table td { font-size: 12px; }
</style>