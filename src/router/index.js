// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "@/lib/supabase";

const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", name: "login", component: () => import("@/views/Login.vue"), meta: { public: true } },
  { path: "/dashboard", name: "dashboard", component: () => import("@/views/Dashboard.vue") },
  { path: "/customers", name: "customers", component: () => import("@/views/CustomerList.vue") },
  { path: "/sales-orders", name: "sales-orders", component: () => import("@/views/SalesOrderList.vue") },
  { path: "/sales-orders/create", name: "create-order", component: () => import("@/views/CreateSalesOrder.vue") },
  { path: "/manufacturing-orders", name: "manufacturing-orders", component: () => import("@/views/ManufacturingOrders.vue") },
  { path: "/create-mo", name: "create-mo", component: () => import("@/views/CreateMO.vue") },
  { path: "/mo-development", name: "mo-development", component: () => import("@/views/Modevelopment.vue") },
  { path: "/eng-documents", name: "eng-documents", component: () => import("@/views/EngDocuments.vue") },
  { path: "/ceo-dashboard", name: "ceo-dashboard", component: () => import("@/views/Ceodashboard.vue") },
  { path: "/raw-material", name: "raw-material", component: () => import("@/views/RawMaterial.vue") },
  { path: "/tooling", name: "tooling", component: () => import("@/views/Tooling.vue") },
  { path: "/gauge", name: "gauge", component: () => import("@/views/Gauge.vue") },
  { path: "/procurement", name: "procurement", component: () => import("@/views/ProcurementOverview.vue") },
  { path: "/my-requests", name: "my-requests", component: () => import("@/views/MyRequestsStatus.vue") },
  { path: "/status", name: "status", component: () => import("@/views/StatusPage.vue") },
  { path: "/user-management", name: "user-management", component: () => import("@/views/UserManagement.vue") },
  { path: "/suppliers", name: "suppliers", component: () => import("@/views/SupplierList.vue") },
  { path: "/subcons", name: "subcons", component: () => import("@/views/SubconList.vue") },
  { path: "/machines", name: "machines", component: () => import("@/views/MachineList.vue") },
  { path: "/documents", name: "documents", component: () => import("@/views/PartDrawingList.vue") },
  { path: "/system-log", name: "system-log", component: () => import("@/views/SystemLogPage.vue") },
  { path: "/process-plan", name: "process-plan", component: () => import("@/views/ProcessPlanPage.vue") },
  { path: "/pp-process-plan", name: "pp-process-plan", component: () => import("@/views/PPProcessPlan.vue") },
  { path: "/subcon-request", name: "subcon-request", component: () => import("@/views/SubconRequest.vue") },
  { path: "/machine-schedule", name: "machine-schedule", component: () => import("@/views/MachineSchedulePage.vue") },
  { path: "/machine-report", name: "machine-report", component: () => import("@/views/MachineReportPage.vue") },
  { path: "/my-tasks", name: "my-tasks", component: () => import("@/views/OperatorTasks.vue") },
  { path: "/qaqc/incoming", name: "qaqc-incoming", component: () => import("@/views/IncomingIQC.vue") },
  { path: "/qaqc/inprocess", name: "qaqc-inprocess", component: () => import("@/views/InprocessIPQC.vue") },
  { path: "/qaqc/outgoing", name: "qaqc-outgoing", component: () => import("@/views/OutgoingOQC.vue") },
  { path: "/ncr", name: "ncr", component: () => import("@/views/NCRPage.vue") },
  { path: "/inspection-history", name: "inspection-history", component: () => import("@/views/InspectionHistoryPage.vue") },
];

const ROUTE_ROLES = {
  "/customers": ["BD"],
  "/sales-orders": ["BD"],
  "/sales-orders/create": ["BD"],
  "/status": ["BD"],
  "/mo-development": ["ENG"],
  "/eng-documents": ["ENG"],
  "/ceo-dashboard": ["MANAGEMENT"],
  "/raw-material": ["SCM"],
  "/tooling": ["SCM"],
  "/gauge": ["SCM"],
  "/procurement": ["SCM"],
  "/my-requests": ["OPERATOR"],
  "/user-management": [],
  "/suppliers": [],
  "/subcons": [],
  "/machines": ["MANAGEMENT", "PRODUCTION_PLANNER", "QC"],
  "/documents": [],
  "/system-log": [],
  "/process-plan": ["MANAGEMENT"],
  "/pp-process-plan": ["PRODUCTION_PLANNER"],
  "/subcon-request": ["PRODUCTION_PLANNER"],
  "/machine-schedule": ["PRODUCTION_PLANNER"],
  "/machine-report": ["PRODUCTION_PLANNER"],
  "/my-tasks": ["OPERATOR"],
  "/qaqc/incoming": ["QC", "MANAGEMENT"],
  "/qaqc/inprocess": ["QC", "MANAGEMENT"],
  "/qaqc/outgoing": ["QC", "MANAGEMENT"],
  "/ncr": ["QC", "MANAGEMENT"],
  "/inspection-history": ["QC", "MANAGEMENT"],
  "/manufacturing-orders": [],
  "/create-mo": [],
};

for (const route of routes) {
  if (route.path in ROUTE_ROLES) {
    route.meta = { ...route.meta, roles: ROUTE_ROLES[route.path] };
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  if (to.meta.public) return true;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return { name: "login" };

  if (to.meta.roles) {
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", data.session.user.id)
      .maybeSingle();
    if (profileError || !profile) return { name: "dashboard" };
    if (profile.role !== "ADMIN" && !to.meta.roles.includes(profile.role)) {
      return { name: "dashboard" };
    }
  }

  return true;
});

export default router;
