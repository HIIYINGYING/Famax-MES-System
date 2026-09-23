<template>
  <aside class="sidebar" :class="{ 'is-open': open }">
    <div class="brand">
      <div class="brand-logo"><img src="/famax-logo.png" alt="" class="logo" /></div>
      <div class="brand-copy"><strong>FAMAX</strong><span>Manufacturing execution</span></div>
    </div>

    <nav aria-label="Primary navigation">
      <section v-for="section in menuSections" :key="section.title" class="nav-section">
        <h2>{{ section.title }}</h2>
        <RouterLink
          v-for="item in section.items"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          active-class="active"
          @click="emit('close')"
        >
          <span class="icon" aria-hidden="true">{{ item.label.slice(0, 1) }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </section>
    </nav>

    <div class="sidebar-footer">
      <div class="workspace-label"><span class="status-dot"></span> MES Workspace</div>
      <button class="logout" @click="emit('logout')">
        <span class="logout-icon" aria-hidden="true">↗</span> Sign out
      </button>
    </div>
  </aside>
</template>

<script setup>
defineOptions({ name: "MesSidebar" });
import { computed } from "vue";

const props = defineProps({
  role: { type: String, default: "" }, // "BD" | "ENG" | "SCM" | "ADMIN"
  open: { type: Boolean, default: false },
});

const emit = defineEmits(["logout", "close"]);

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

function sectionFor(path) {
  if (path === "/dashboard" || path === "/ceo-dashboard") return "Overview";
  if (["/customers", "/sales-orders", "/sales-orders/create", "/status"].includes(path)) return "Sales & Orders";
  if (["/raw-material", "/tooling", "/gauge", "/procurement", "/suppliers", "/subcons"].includes(path)) return "Supply Chain";
  if (["/qaqc/incoming", "/qaqc/inprocess", "/qaqc/outgoing", "/ncr", "/inspection-history"].includes(path)) return "Quality";
  if (["/user-management", "/documents", "/system-log"].includes(path)) return "Administration";
  return "Operations";
}

const menuSections = computed(() => {
  const sections = [];
  for (const item of menuItems.value) {
    const title = sectionFor(item.path);
    let section = sections.find((group) => group.title === title);
    if (!section) {
      section = { title, items: [] };
      sections.push(section);
    }
    section.items.push(item);
  }
  return sections;
});
</script>
