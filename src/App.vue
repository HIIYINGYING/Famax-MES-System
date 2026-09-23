<template>
  <!-- Login page has no sidebar/topbar -->
  <RouterView v-if="route.meta.public" />

  <div v-else class="layout">
    <div v-if="sidebarOpen" class="sidebar-scrim" @click="sidebarOpen = false"></div>
    <Sidebar :role="role" :open="sidebarOpen" @close="sidebarOpen = false" @logout="handleLogout" />

    <div class="main">
      <Topbar :title="pageTitle" :userName="userName" :department="roleLabels[role] || 'Workspace'" @toggle-sidebar="sidebarOpen = !sidebarOpen" />
      <div class="content">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Sidebar from "@/components/Sidebar.vue";
import Topbar from "@/components/Topbar.vue";
import { supabase } from "@/lib/supabase";

const route = useRoute();
const router = useRouter();

const role = ref(null);
const userName = ref("");
const sidebarOpen = ref(false);

const roleLabels = {
  ADMIN: "Administrator",
  BD: "Business Development",
  ENG: "Engineering",
  SCM: "Supply Chain",
  MANAGEMENT: "Management",
  PRODUCTION_PLANNER: "Production Planning",
  OPERATOR: "Production Operator",
  QC: "Quality Control",
};
const pageLabels = {
  dashboard: "Dashboard",
  "ceo-dashboard": "Executive Overview",
  "create-order": "Create Sales Order",
  "create-mo": "Create Manufacturing Order",
  customers: "Customer Management",
  "sales-orders": "Sales Orders",
  "manufacturing-orders": "Manufacturing Orders",
  "mo-development": "Manufacturing Order Development",
  "eng-documents": "Engineering Documents",
  "raw-material": "Raw Material",
  tooling: "Tooling",
  gauge: "Gauge Management",
  procurement: "Procurement",
  "my-requests": "My Requests",
  status: "Order Status",
  "user-management": "User Management",
  suppliers: "Supplier List",
  subcons: "Subcontractors",
  machines: "Machine List",
  documents: "Document List",
  "system-log": "System Log",
  "process-plan": "Process Plan",
  "pp-process-plan": "Production Planning",
  "subcon-request": "Subcontractor Requests",
  "machine-schedule": "Machine Schedule",
  "machine-report": "Machine Report",
  "my-tasks": "My Production Tasks",
  "qaqc-incoming": "Incoming Inspection",
  "qaqc-inprocess": "In Process Inspection",
  "qaqc-outgoing": "Outgoing Inspection",
  ncr: "Non-Conformance Reports",
  "inspection-history": "Inspection History",
};
const dashboardTitles = {
  ADMIN: "Administrator Overview",
  BD: "Business Development Dashboard",
  ENG: "Engineering Dashboard",
  SCM: "Supply Chain Dashboard",
  MANAGEMENT: "Production Dashboard",
  PRODUCTION_PLANNER: "Production Planner Dashboard",
  OPERATOR: "My Production Tasks",
  QC: "Quality Dashboard",
};
const pageTitle = computed(() => {
  if (route.name === "dashboard") return dashboardTitles[role.value] || "MES Dashboard";
  if (pageLabels[route.name]) return pageLabels[route.name];
  return String(route.name || "MES Workspace")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
});

async function loadProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!error && data) {
    role.value = data.role;
    userName.value = data.full_name;
  }
}

onMounted(loadProfile);

// Reload profile info whenever navigating away from the public /login
// route, so the sidebar/topbar populate right after a fresh login.
watch(
  () => route.meta.public,
  (isPublic) => {
    if (!isPublic) loadProfile();
  }
);

watch(() => route.fullPath, () => { sidebarOpen.value = false; });

async function handleLogout() {
  await supabase.auth.signOut();
  router.push({ name: "login" });
}
</script>
