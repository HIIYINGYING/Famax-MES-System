// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "@/lib/supabase";

import Login from "@/views/Login.vue";
import Dashboard from "@/views/Dashboard.vue";
import CustomerList from "@/views/CustomerList.vue";
import SalesOrderList from "@/views/SalesOrderList.vue";
import CreateSalesOrder from "@/views/CreateSalesOrder.vue";
import ManufacturingOrders from "@/views/ManufacturingOrders.vue";
import CreateMO from "@/views/CreateMO.vue";
import ENGDashboard from "@/views/Engdashboard.vue";
import MODevelopment from "@/views/Modevelopment.vue";
import EngDocuments from "@/views/EngDocuments.vue";
import CEODashboard from "@/views/Ceodashboard.vue";
import RawMaterial from "@/views/RawMaterial.vue";
import Tooling from "@/views/Tooling.vue";
import Gauge from "@/views/Gauge.vue";
import SCMDashboard from "@/views/ScmDashboard.vue";
import ProcurementOverview from "@/views/ProcurementOverview.vue";
import MyRequestsStatus from "@/views/MyRequestsStatus.vue";
import StatusPage from "@/views/StatusPage.vue";
import UserManagement from "@/views/UserManagement.vue";
import SupplierList from "@/views/SupplierList.vue";
import SubconList from "@/views/SubconList.vue";
import MachineList from "@/views/MachineList.vue";
import PartDrawingList from "@/views/PartDrawingList.vue";
import SystemLogPage from "@/views/SystemLogPage.vue";
import ProcessPlanPage from "@/views/ProcessPlanPage.vue";
import PPDashboard from "@/views/PPDashboard.vue";
import PPProcessPlan from "@/views/PPProcessPlan.vue";
import SubconRequest from "@/views/SubconRequest.vue";
import MachineSchedulePage from "@/views/MachineSchedulePage.vue";
import MachineReportPage from "@/views/MachineReportPage.vue";
import OperatorTasks from "@/views/OperatorTasks.vue";
import QCDashboard from "@/views/QCDashboard.vue";
import IncomingIQC from "@/views/IncomingIQC.vue";
import InProcessIPQC from "@/views/InprocessIPQC.vue";
import OutgoingOQC from "@/views/OutgoingOQC.vue";
import NCRPage from "@/views/NCRPage.vue";
import InspectionHistoryPage from "@/views/InspectionHistoryPage.vue";

const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", name: "login", component: Login, meta: { public: true } },
  { path: "/dashboard", name: "dashboard", component: Dashboard },
  { path: "/customers", name: "customers", component: CustomerList },
  { path: "/sales-orders", name: "sales-orders", component: SalesOrderList },
  { path: "/sales-orders/create",  name: "create-order",  component: CreateSalesOrder },
  { path: "/manufacturing-orders", name: "manufacturing-orders", component: ManufacturingOrders },
  { path: "/create-mo", name: "create-mo", component: CreateMO },
  { path: "/mo-development", name: "mo-development", component: MODevelopment },
  { path: "/eng-documents", name: "eng-documents", component: EngDocuments },
  { path: "/ceo-dashboard", name: "ceo-dashboard", component: CEODashboard },
  { path: "/raw-material", name: "raw-material", component: RawMaterial },
  { path: "/tooling", name: "tooling", component: Tooling },
  { path: "/gauge", name: "gauge", component: Gauge },
  { path: "/procurement", name: "procurement", component: ProcurementOverview },
  { path: "/my-requests", name: "my-requests", component: MyRequestsStatus },
  { path: "/status", name: "status", component: StatusPage },
  { path: "/user-management", name: "user-management", component: UserManagement },
  { path: "/suppliers", name: "suppliers", component: SupplierList },
  { path: "/subcons", name: "subcons", component: SubconList },
  { path: "/machines", name: "machines", component: MachineList },
  { path: "/documents", name: "documents", component: PartDrawingList },
  { path: "/system-log", name: "system-log", component: SystemLogPage },
  { path: "/process-plan", name: "process-plan", component: ProcessPlanPage },
  { path: "/pp-process-plan", name: "pp-process-plan", component: PPProcessPlan },
  { path: "/subcon-request", name: "subcon-request", component: SubconRequest },
  { path: "/machine-schedule", name: "machine-schedule", component: MachineSchedulePage },
  { path: "/machine-report", name: "machine-report", component: MachineReportPage },
  { path: "/my-tasks", name: "my-tasks", component: OperatorTasks },
  { path: "/qaqc/incoming", name: "qaqc-incoming", component: IncomingIQC },
  { path: "/qaqc/inprocess", name: "qaqc-inprocess", component: InProcessIPQC },
  { path: "/qaqc/outgoing", name: "qaqc-outgoing", component: OutgoingOQC },
  { path: "/ncr", name: "ncr", component: NCRPage },
  { path: "/inspection-history", name: "inspection-history", component: InspectionHistoryPage },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  if (to.meta.public) return true;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { name: "login" };
  return true;
});

export default router;