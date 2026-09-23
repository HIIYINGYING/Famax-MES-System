<template>
  <div v-if="loading" class="loading">Loading…</div>
  <div v-else-if="error" class="error">{{ error }}</div>

  <Admin v-else-if="role === 'ADMIN'" />
  <BD v-else-if="role === 'BD'" />
  <PPDashboard v-else-if="role === 'PRODUCTION_PLANNER'" />
  <ManagementDashboard v-else-if="role === 'MANAGEMENT'" />
  <ENGDashboard v-else-if="role === 'ENG'" />
  <SCMDashboard v-else-if="role === 'SCM'" />
  <QCDashboard v-else-if="role === 'QC'" />
  <OperatorTasks v-else-if="role === 'OPERATOR'" />
  <div v-else class="placeholder">No role found for this account. Contact an admin.</div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "@/lib/supabase";
import Admin from "@/views/Admin.vue";
import BD from "@/views/BD.vue";
import ENGDashboard from "@/views/Engdashboard.vue";
import PPDashboard from "@/views/PPDashboard.vue";
import ManagementDashboard from "@/views/ManagementDashboard.vue";
import OperatorTasks from "@/views/OperatorTasks.vue";
import QCDashboard from "@/views/QCDashboard.vue";
import SCMDashboard from "@/views/ScmDashboard.vue";

const role = ref(null);
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { error.value = "Not logged in."; return; }

    const { data, error: dbError } = await supabase
      .from("user_profiles").select("role").eq("id", user.id).single();

    if (dbError) throw dbError;
    role.value = data.role;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.loading, .error, .placeholder { padding: 24px; font-size: 14px; color: #666; }
.error { color: #c62828; }
</style>