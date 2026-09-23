<template>
  <div class="page">
    <div class="page-header">
      <h1>{{ title }}</h1>
      <button class="primary" @click="showCreate = !showCreate">
        {{ showCreate ? "Cancel" : "Add " + title }}
      </button>
    </div>

    <form v-if="showCreate" class="card form-grid" @submit.prevent="createPartner">
      <div>
        <label>Code</label>
        <input v-model="form.partner_code" required />
      </div>
      <div>
        <label>Name</label>
        <input v-model="form.name" required />
      </div>
      <div>
        <label>Contact Person</label>
        <input v-model="form.contact_person" />
      </div>
      <div>
        <label>Phone Number</label>
        <input v-model="form.phone_number" />
      </div>
      <div class="span-2">
        <label>Email</label>
        <input v-model="form.email" type="email" />
      </div>
      <div class="span-2">
        <button class="primary" type="submit" :disabled="saving">
          {{ saving ? "Saving…" : "Save" }}
        </button>
      </div>
      <p v-if="formError" class="error span-2">{{ formError }}</p>
    </form>

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <table v-else>
        <thead>
          <tr><th>Name</th><th>Contact Person</th><th>Phone Number</th><th>Email</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="p in partners" :key="p.id">
            <td>{{ p.name }}</td>
            <td>{{ p.contact_person || "-" }}</td>
            <td>{{ p.phone_number || "-" }}</td>
            <td>{{ p.email || "-" }}</td>
            <td><span class="pill" :class="p.status === 'ACTIVE' ? 'green' : 'grey'">{{ p.status }}</span></td>
            <td><a href="#">View</a></td>
          </tr>
          <tr v-if="partners.length === 0"><td colspan="6" class="empty">No {{ title.toLowerCase() }} yet.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from "vue";
import { supabase } from "@/lib/supabase";

const props = defineProps({
  type: { type: String, required: true }, // 'SUPPLIER' | 'SUBCON'
  title: { type: String, required: true },
});

const partners = ref([]);
const loading = ref(true);
const error = ref(null);
const showCreate = ref(false);
const saving = ref(false);
const formError = ref(null);
const form = reactive({ partner_code: "", name: "", contact_person: "", phone_number: "", email: "" });

async function loadPartners() {
  loading.value = true;
  const { data, error: err } = await supabase
    .from("partners").select("*").eq("partner_type", props.type).order("name");
  if (err) error.value = err.message;
  else partners.value = data;
  loading.value = false;
}

async function createPartner() {
  saving.value = true;
  formError.value = null;
  const { error: err } = await supabase.from("partners").insert({ ...form, partner_type: props.type });
  saving.value = false;
  if (err) { formError.value = err.message; return; }
  showCreate.value = false;
  Object.assign(form, { partner_code: "", name: "", contact_person: "", phone_number: "", email: "" });
  loadPartners();
}

watch(() => props.type, loadPartners);
onMounted(loadPartners);
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
.pill.grey { background: #eee; color: #777; }
.primary { background: #3f51b5; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.error { color: #c62828; font-size: 13px; }
.loading, .empty { color: #888; padding: 16px 0; text-align: center; }
</style>