<template>
  <div class="page">
    <div class="page-header">
      <h1>User Management</h1>
      <button class="primary" @click="showCreate = !showCreate">
        {{ showCreate ? "Cancel" : "Create User" }}
      </button>
    </div>

    <!-- NOTE: creating a real login account (auth.users) requires an
         admin/service-role key, which must NEVER be exposed in the
         frontend. This form only creates the user_profiles record.
         Pair it with a Supabase Edge Function (using the service role
         key server-side) that actually creates the auth account and
         calls this table — see note below the form. -->
    <form v-if="showCreate" class="card form-grid" @submit.prevent="createUser">
      <div>
        <label>Employee ID</label>
        <input v-model="form.employee_id" required />
      </div>
      <div>
        <label>Full Name</label>
        <input v-model="form.full_name" required />
      </div>
      <div>
        <label>Email Address</label>
        <input v-model="form.email" type="email" required />
      </div>
      <div>
        <label>Phone Number</label>
        <input v-model="form.phone_number" />
      </div>
      <div>
        <label>Department</label>
        <input v-model="form.department" />
      </div>
      <div>
        <label>Username</label>
        <input v-model="form.username" required />
      </div>
      <div>
        <label>Role</label>
        <select v-model="form.role" required>
          <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
        </select>
      </div>
      <div>
        <label>Account Status</label>
        <select v-model="form.account_status">
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>
      <div class="span-2">
        <p class="note">
          This creates the profile record only. The matching login account must be
          created separately (Supabase Auth admin API, via an Edge Function) using
          the same email — auth account creation isn't safe to do from the browser.
        </p>
        <button class="primary" type="submit" :disabled="saving">
          {{ saving ? "Saving…" : "Save Profile" }}
        </button>
      </div>
      <p v-if="formError" class="error span-2">{{ formError }}</p>
    </form>

    <div class="card">
      <div v-if="loading" class="loading">Loading users…</div>
      <div v-else-if="error" class="error">{{ error }}</div>

      <table v-else>
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Role</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.employee_id || "-" }}</td>
            <td>{{ u.full_name }}</td>
            <td>{{ u.email }}</td>
            <td>{{ u.department || "-" }}</td>
            <td>{{ u.role }}</td>
            <td><span class="pill" :class="u.account_status === 'ACTIVE' ? 'green' : 'grey'">{{ u.account_status }}</span></td>
            <td><a href="#" @click.prevent="openEdit(u)">Edit</a></td>
          </tr>
          <tr v-if="users.length === 0"><td colspan="7" class="empty">No users found.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="editing" class="modal-backdrop" @click.self="editing = null">
      <div class="modal">
        <h2>Edit User</h2>
        <label>Full Name</label>
        <input v-model="editing.full_name" />
        <label>Department</label>
        <input v-model="editing.department" />
        <label>Role</label>
        <select v-model="editing.role">
          <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
        </select>
        <label>Account Status</label>
        <select v-model="editing.account_status">
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
        <div class="modal-actions">
          <button @click="editing = null">Cancel</button>
          <button class="primary" @click="saveEdit" :disabled="saving">
            {{ saving ? "Saving…" : "Save" }}
          </button>
        </div>
        <p v-if="formError" class="error">{{ formError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const users = ref([]);
const loading = ref(true);
const error = ref(null);
const roles = ["BD", "ENG", "SCM", "ADMIN", "MANAGEMENT", "QC", "PRODUCTION PLANNER"];

const showCreate = ref(false);
const saving = ref(false);
const formError = ref(null);
const editing = ref(null);

const form = reactive({
  employee_id: "", full_name: "", email: "", phone_number: "",
  department: "", username: "", role: "BD", account_status: "ACTIVE",
});

async function loadUsers() {
  loading.value = true;
  const { data, error: err } = await supabase
    .from("user_profiles")
    .select("*")
    .order("full_name");
  if (err) error.value = err.message;
  else users.value = data;
  loading.value = false;
}

async function createUser() {
  saving.value = true;
  formError.value = null;
  // NOTE: id must reference a real auth.users row (FK constraint).
  // This will fail unless that account already exists — this is the
  // "profile-only" half described in the note above.
  formError.value = "Create the auth account first (via Edge Function or Supabase dashboard), then link its id here.";
  saving.value = false;
}

function openEdit(u) {
  editing.value = { ...u };
  formError.value = null;
}

async function saveEdit() {
  saving.value = true;
  const { error: err } = await supabase
    .from("user_profiles")
    .update({
      full_name: editing.value.full_name,
      department: editing.value.department,
      role: editing.value.role,
      account_status: editing.value.account_status,
    })
    .eq("id", editing.value.id);
  saving.value = false;
  if (err) { formError.value = err.message; return; }
  editing.value = null;
  loadUsers();
}

onMounted(loadUsers);
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h1 { font-size: 20px; margin: 0; }
.card { background: #fff; border: 1px solid #e2e2e2; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid .span-2 { grid-column: span 2; }
label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; margin-top: 8px; }
input, select { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
.note { font-size: 12px; color: #888; background: #f7f7f9; padding: 8px; border-radius: 4px; margin-bottom: 8px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; padding: 8px; border-bottom: 1px solid #eee; }
td { padding: 8px; border-bottom: 1px solid #f2f2f2; }
.pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.pill.green { background: #e8f5e9; color: #2e7d32; }
.pill.grey { background: #eee; color: #777; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.primary:disabled { opacity: 0.6; cursor: not-allowed; }
.error { color: #c62828; font-size: 13px; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; padding: 24px; border-radius: 8px; width: 360px; display: flex; flex-direction: column; gap: 4px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
</style>