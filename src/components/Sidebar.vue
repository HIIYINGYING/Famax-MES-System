<template>
  <aside class="sidebar">
    <div class="brand">
      <img src="/famax-logo.png" alt="FAMAX" class="logo" />
      <span>FAMAX<br />MES SYSTEM</span>
    </div>

    <nav>
      <RouterLink
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        active-class="active"
      >
        <span class="icon">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <button class="logout" @click="$emit('logout')">
      ⎋ Logout
    </button>
  </aside>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  role: { type: String, required: true }, // "BD" | "ENG" | "SCM" | "ADMIN"
});

defineEmits(["logout"]);

// Menus per role, matching the sidebars seen in the design
const MENUS = {
  BD: [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "Customer", path: "/customers", icon: "🏢" },
    { label: "Sales Order", path: "/sales-orders", icon: "📋" },
    { label: "Status", path: "/status", icon: "✅" },
  ],
  ENG: [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "Manufacturing Order", path: "/mo-development", icon: "⚙️" },
    { label: "Documents", path: "/eng-documents", icon: "📄" },
  ],
  SCM: [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "Raw Material", path: "/raw-material", icon: "🧱" },
    { label: "Tooling", path: "/tooling", icon: "🔧" },
    { label: "Gauge", path: "/gauge", icon: "📏" },
    { label: "Procurement", path: "/procurement", icon: "🚚" },
  ],
  ADMIN: [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "Executive Overview", path: "/ceo-dashboard", icon: "📊" },
    { label: "User Management", path: "/user-management", icon: "👤" },
    { label: "Customer", path: "/customers", icon: "🏢" },
    { label: "Sales Order", path: "/sales-orders", icon: "📋" },
    { label: "Status", path: "/status", icon: "✅" },
    { label: "MO", path: "/manufacturing-orders", icon: "⚙️" },
    { label: "Create MO", path: "/create-mo", icon: "➕" },
    { label: "Supplier List", path: "/suppliers", icon: "🚚" },
    { label: "Subcon List", path: "/subcons", icon: "🤝" },
    { label: "Subcon Requests", path: "/subcon-request", icon: "🤝" },
    { label: "Machine List", path: "/machines", icon: "🖥️" },
    { label: "Machine Schedule", path: "/machine-schedule", icon: "🗓️" },
    { label: "Machine Report", path: "/machine-report", icon: "🛠️" },
    { label: "Raw Material", path: "/raw-material", icon: "🧱" },
    { label: "Tooling", path: "/tooling", icon: "🔧" },
    { label: "Gauge", path: "/gauge", icon: "📏" },
    { label: "Procurement", path: "/procurement", icon: "🚚" },
    { label: "Document List", path: "/documents", icon: "📄" },
    { label: "Process Plan", path: "/process-plan", icon: "📅" },
    { label: "PP Process Plan", path: "/pp-process-plan", icon: "📅" },
    { label: "Incoming (IQC)", path: "/qaqc/incoming", icon: "🔍" },
    { label: "In-Process (IPQC)", path: "/qaqc/inprocess", icon: "🔍" },
    { label: "Outgoing (OQC)", path: "/qaqc/outgoing", icon: "🔍" },
    { label: "NCR", path: "/ncr", icon: "⚠️" },
    { label: "Inspection History", path: "/inspection-history", icon: "🗂️" },
    { label: "My Tasks", path: "/my-tasks", icon: "🛠️" },
    { label: "System Log", path: "/system-log", icon: "🗒️" },
  ],
  MANAGEMENT: [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "Executive Overview", path: "/ceo-dashboard", icon: "📊" },
    { label: "Process Plan", path: "/process-plan", icon: "📅" },
    { label: "Incoming (IQC)", path: "/qaqc/incoming", icon: "🔍" },
    { label: "In-Process (IPQC)", path: "/qaqc/inprocess", icon: "🔍" },
    { label: "Outgoing (OQC)", path: "/qaqc/outgoing", icon: "🔍" },
    { label: "NCR", path: "/ncr", icon: "⚠️" },
    { label: "Inspection History", path: "/inspection-history", icon: "🗂️" },
    { label: "Machine", path: "/machines", icon: "🖥️" },
  ],
  PRODUCTION_PLANNER: [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "Process Plan", path: "/pp-process-plan", icon: "📅" },
    { label: "Subcon", path: "/subcon-request", icon: "🤝" },
    { label: "Machine List", path: "/machines", icon: "🖥️" },
    { label: "Machine Schedule", path: "/machine-schedule", icon: "🗓️" },
    { label: "Machine Report", path: "/machine-report", icon: "🛠️" },
  ],
  OPERATOR: [
    { label: "My Tasks", path: "/my-tasks", icon: "🛠️" },
    { label: "Status", path: "/my-requests", icon: "📦" },
  ],
  QC: [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "Incoming (IQC)", path: "/qaqc/incoming", icon: "🔍" },
    { label: "In-Process (IPQC)", path: "/qaqc/inprocess", icon: "🔍" },
    { label: "Outgoing (OQC)", path: "/qaqc/outgoing", icon: "🔍" },
    { label: "NCR", path: "/ncr", icon: "⚠️" },
    { label: "Inspection History", path: "/inspection-history", icon: "🗂️" },
    { label: "Machine", path: "/machines", icon: "🖥️" },
  ],
};

const menuItems = computed(() => MENUS[props.role] || []);
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 200px;
  height: 100vh;
  background: #ffffff;
  border-right: 1px solid #e2e2e2;
  padding: 16px 0;
  flex-shrink: 0;
  overflow: hidden;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px 16px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.1;
  border-bottom: 1px solid #eee;
}

.logo {
  height: 26px;
}

nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: 12px;
  overflow-y: auto;
  min-height: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 13px;
  color: #555;
  text-decoration: none;
}

.nav-item:hover {
  background: #f5f5f5;
}

.nav-item.active {
  background: #e8edff;
  color: #3f51b5;
  font-weight: 600;
  border-right: 3px solid #3f51b5;
}

.icon {
  width: 18px;
  text-align: center;
}

.logout {
  margin: 12px 16px 0;
  padding: 8px;
  background: #607d8b;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.logout:hover {
  background: #546e7a;
}
</style>