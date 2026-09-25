"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Bell, Boxes, BriefcaseBusiness, Building2, CalendarDays, Check, ChevronDown, ClipboardCheck, ClipboardList, Cog, FileText, Gauge, HardHat, LayoutDashboard, LogOut, Menu, Package, PackageSearch, Plus, Search, Send, Settings2, ShieldAlert, Truck, Users, Wrench } from "lucide-react";
import { authClient } from "@famax/auth/client";
import { Button, Card, PageHeading, StatusBadge } from "@famax/ui";

type NavItem = { label: string; path: string; icon: typeof LayoutDashboard };
const groups: { label: string; items: NavItem[] }[] = [
  { label: "Workspace", items: [{ label: "Overview", path: "/dashboard", icon: LayoutDashboard }, { label: "Executive overview", path: "/ceo-dashboard", icon: Activity }] },
  { label: "Commercial", items: [{ label: "Customers", path: "/customers", icon: Building2 }, { label: "Sales orders", path: "/sales-orders", icon: BriefcaseBusiness }, { label: "Order status", path: "/status", icon: Check }] },
  { label: "Production", items: [{ label: "Manufacturing orders", path: "/manufacturing-orders", icon: Cog }, { label: "Create work order", path: "/create-mo", icon: Plus }, { label: "MO development", path: "/mo-development", icon: ClipboardList }, { label: "Process plans", path: "/process-plan", icon: FileText }, { label: "Production planning", path: "/pp-process-plan", icon: CalendarDays }, { label: "Machine schedule", path: "/machine-schedule", icon: CalendarDays }, { label: "Machines", path: "/machines", icon: Wrench }, { label: "Operator tasks", path: "/my-tasks", icon: HardHat }] },
  { label: "Supply chain", items: [{ label: "Inventory", path: "/raw-material", icon: Package }, { label: "Procurement", path: "/procurement", icon: PackageSearch }, { label: "My requests", path: "/my-requests", icon: ClipboardList }, { label: "Suppliers", path: "/suppliers", icon: Truck }, { label: "Subcontractors", path: "/subcons", icon: Users }, { label: "Subcontract requests", path: "/subcon-request", icon: Truck }, { label: "Tooling", path: "/tooling", icon: Wrench }, { label: "Gauge management", path: "/gauge", icon: Gauge }] },
  { label: "Quality", items: [{ label: "Incoming inspection", path: "/qaqc/incoming", icon: ClipboardCheck }, { label: "In-process inspection", path: "/qaqc/inprocess", icon: ClipboardCheck }, { label: "Outgoing inspection", path: "/qaqc/outgoing", icon: ClipboardCheck }, { label: "Non-conformance", path: "/ncr", icon: ShieldAlert }, { label: "Inspection history", path: "/inspection-history", icon: FileText }] },
  { label: "Administration", items: [{ label: "Engineering documents", path: "/eng-documents", icon: FileText }, { label: "Document library", path: "/documents", icon: FileText }, { label: "Users & access", path: "/user-management", icon: Users }, { label: "Machine reports", path: "/machine-report", icon: ClipboardList }, { label: "System activity", path: "/system-log", icon: Activity }] },
];

function prettify(value: string) { return value.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ").replace(/\b\w/g, c => c.toUpperCase()) ?? "Workspace"; }

const roleRoutes: Record<string, string[]> = {
  ADMIN: ["*"], BD: ["/dashboard", "/customers", "/sales-orders", "/sales-orders/create", "/status"],
  ENG: ["/dashboard", "/mo-development", "/eng-documents"], SCM: ["/dashboard", "/raw-material", "/tooling", "/gauge", "/procurement"],
  MANAGEMENT: ["/dashboard", "/ceo-dashboard", "/process-plan", "/qaqc/incoming", "/qaqc/inprocess", "/qaqc/outgoing", "/ncr", "/inspection-history", "/machines"],
  PRODUCTION_PLANNER: ["/dashboard", "/manufacturing-orders", "/create-mo", "/pp-process-plan", "/subcon-request", "/machines", "/machine-schedule", "/machine-report", "/process-plan"],
  OPERATOR: ["/dashboard", "/my-tasks", "/my-requests"],
  QC: ["/dashboard", "/qaqc/incoming", "/qaqc/inprocess", "/qaqc/outgoing", "/ncr", "/inspection-history", "/machines"],
};

export function AppShell({ children, user = { name: "FAMAX Operator", mesRole: "OPERATOR" } }: { children: React.ReactNode; user?: { name: string; mesRole: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const title = pathname === "/dashboard" ? "Overview" : prettify(pathname);
  const allowed = roleRoutes[user.mesRole] ?? roleRoutes.OPERATOR;
  const name = user.name || "FAMAX team member";
  const visibleGroups = groups.map(group => ({ ...group, items: group.items.filter(item => allowed.includes("*") || allowed.includes(item.path)) })).filter(group => group.items.length > 0);
  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const capture = (event: Event) => { event.preventDefault(); setInstallEvent(event as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);
  async function installApp() { if (!installEvent) return; await installEvent.prompt(); setInstallEvent(null); }
  async function signOut() { await authClient.signOut(); router.replace("/login"); router.refresh(); }
  return <div className="app-frame">
    <aside className={`sidebar ${menuOpen ? "open" : ""}`}><Link href="/dashboard" className="brand"><span className="brand-mark">FM</span><span><strong>FAMAX</strong><small>MANUFACTURING SYSTEMS</small></span></Link>
      <nav className="nav-scroll" aria-label="Main navigation">{visibleGroups.map(group => <div className="nav-group" key={group.label}><h2>{group.label}</h2>{group.items.map(item => { const Icon = item.icon; return <Link key={item.path} onClick={() => setMenuOpen(false)} className={`nav-item ${pathname === item.path || pathname.startsWith(`${item.path}/`) ? "active" : ""}`} href={item.path}><Icon size={15}/>{item.label}</Link>; })}</div>)}</nav>
      <div className="sidebar-bottom"><div className="workspace-state"><span className="online-dot"/> Production workspace</div><button className="sidebar-signout" onClick={() => void signOut()}><LogOut size={13}/> Sign out</button><p>FAMAX MES · v2.0</p></div>
    </aside>
    {menuOpen && <button aria-label="Close menu" className="mobile-scrim" onClick={() => setMenuOpen(false)}/>}
    <div className="main-area"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={18}/></button><span className="crumb">Manufacturing</span><span className="crumb">/</span><strong className="crumb">{title}</strong></div><div className="topbar-right"><div className="top-actions"><button className="icon-button optional" title="Search"><Search size={16}/></button><button className="icon-button" title="Notifications"><Bell size={16}/></button>{installEvent && <button className="install-button" onClick={() => void installApp()}>Install app</button>}<span className="top-divider"/></div><div className="user-chip"><span className="user-avatar">{name.split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase()}</span><span className="user-copy"><strong>{name}</strong><small>{user.mesRole.replaceAll("_", " ")}</small></span><ChevronDown size={14} color="#8591a0"/></div></div></header><main className="content-area">{children}</main></div>
  </div>;
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

const definitions: Record<string, { title: string; description: string; noun: string; headers: string[]; rows: string[][] }> = {
  "/customers": { title: "Customer management", description: "Manage customer details and maintain a reliable account directory.", noun: "customer", headers: ["Customer code", "Company", "Contact", "Status"], rows: [] },
  "/sales-orders": { title: "Order management", description: "Create customer demand and follow every order through the manufacturing handoff.", noun: "sales order", headers: ["Order number", "Customer", "Quantity", "Required date", "Status"], rows: [] },
  "/manufacturing-orders": { title: "Manufacturing orders", description: "Coordinate every work order from release to quality approval.", noun: "work order", headers: ["Work order", "Part number", "Quantity", "Planned finish", "Status"], rows: [] },
  "/machines": { title: "Machines", description: "Monitor equipment availability and production capacity.", noun: "machine", headers: ["Machine", "Name", "Work center", "Capacity / shift", "Status"], rows: [] },
  "/procurement": { title: "Procurement", description: "Track purchase requests, supplier commitments, and inbound materials.", noun: "purchase request", headers: ["Request", "Description", "Quantity", "Required by", "Status"], rows: [] },
  "/raw-material": { title: "Raw material inventory", description: "Review available stock, lot traceability, and replenishment needs.", noun: "material", headers: ["Material", "Part number", "On hand", "Location", "Status"], rows: [] },
  "/my-tasks": { title: "My production tasks", description: "Your assigned operations, due times, and work instructions.", noun: "task", headers: ["Operation", "Work order", "Machine", "Due", "Status"], rows: [] },
  "/qaqc/incoming": { title: "Incoming inspection", description: "Inspect purchased materials before they enter production stock.", noun: "inspection", headers: ["Inspection", "Part number", "Lot", "Quantity", "Status"], rows: [] },
  "/qaqc/inprocess": { title: "In-process inspection", description: "Review quality checks recorded during active production operations.", noun: "inspection", headers: ["Inspection", "Part number", "Lot", "Quantity", "Status"], rows: [] },
  "/qaqc/outgoing": { title: "Outgoing inspection", description: "Verify finished goods before release and customer shipment.", noun: "inspection", headers: ["Inspection", "Part number", "Lot", "Quantity", "Status"], rows: [] },
};

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
type Customer = { id: string; code: string; name: string; email: string | null; phone: string | null; address: string | null; active: boolean };
type SalesOrder = { id: string; orderNumber: string; customerName: string | null; customerReference: string | null; requiredDate: string | null; status: string; items: { partNumber: string; quantity: number }[] };
async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { ...init, credentials: "include", headers: { "content-type": "application/json", ...init?.headers } });
  if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.message ?? "The MES service could not complete this request."); }
  return response.json() as Promise<T>;
}

function FormPage({ kind }: { kind: "order" | "mo" | "customer" }) {
  const router = useRouter(); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [customers, setCustomers] = useState<Customer[]>([]);
  const isOrder = kind === "order"; const isCustomer = kind === "customer";
  useEffect(() => { if (isOrder) void apiRequest<Customer[]>("/customers").then(setCustomers).catch(error => setMessage(error.message)); }, [isOrder]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage(""); const data = new FormData(e.currentTarget);
    const payload = isCustomer ? { name: data.get("name"), email: data.get("email") || undefined, phone: data.get("phone") || undefined, address: data.get("address") || undefined } : isOrder ? { customerId: data.get("customerId"), customerReference: data.get("customerReference") || undefined, requiredDate: data.get("requiredDate") || undefined, partNumber: data.get("partNumber"), description: data.get("description") || undefined, quantity: Number(data.get("quantity")), notes: data.get("notes") || undefined } : { orderNumber: data.get("orderNumber"), partNumber: data.get("partNumber"), quantity: Number(data.get("quantity")), plannedStart: data.get("plannedStart") || undefined, plannedFinish: data.get("plannedFinish") || undefined, priority: data.get("priority"), notes: data.get("notes") || undefined };
    try { await apiRequest(isCustomer ? "/customers" : isOrder ? "/sales-orders" : "/manufacturing-orders", { method: "POST", body: JSON.stringify(payload) }); router.push(isCustomer ? "/customers" : isOrder ? "/sales-orders" : "/manufacturing-orders"); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save this record."); } finally { setBusy(false); }
  }
  const title = isCustomer ? "Create customer" : isOrder ? "Create sales order" : "Create manufacturing order";
  return <div className="page-stack"><PageHeading eyebrow="Order management" title={title} description={isCustomer ? "Add a customer account for order entry and production tracking." : "Capture the order details required to begin the manufacturing workflow."}/><Card><form onSubmit={submit}><div className="form-grid">
    {isCustomer ? <><Field label="Company name" name="name" placeholder="Customer company"/><Field label="Email address" name="email" placeholder="name@company.com" type="email" required={false}/><Field label="Phone" name="phone" placeholder="Contact number" required={false}/><Field label="Address" name="address" placeholder="Business address" required={false}/></> : isOrder ? <><div className="field"><label htmlFor="customerId">Customer</label><select id="customerId" name="customerId" required defaultValue=""><option value="" disabled>Select a customer</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.code}</option>)}</select></div><Field label="Customer purchase order" name="customerReference" placeholder="PO number" required={false}/><Field label="Required delivery" name="requiredDate" placeholder="" type="date"/><Field label="Part number" name="partNumber" placeholder="e.g. PH-4402"/><Field label="Part description" name="description" placeholder="Part name" required={false}/><Field label="Quantity" name="quantity" placeholder="Enter quantity" type="number"/><Field label="Notes" name="notes" placeholder="Order instructions" required={false} full/></> : <><Field label="Work order number" name="orderNumber" placeholder="e.g. MO-2026-001"/><Field label="Part number" name="partNumber" placeholder="e.g. PH-4402"/><Field label="Planned quantity" name="quantity" placeholder="Enter quantity" type="number"/><Field label="Priority" name="priority" placeholder="Select priority" select={["normal", "high", "urgent"]}/><Field label="Planned start" name="plannedStart" placeholder="" type="date" required={false}/><Field label="Planned finish" name="plannedFinish" placeholder="" type="date" required={false}/><Field label="Notes" name="notes" placeholder="Production instructions" required={false} full/></>}
  </div>{message && <p className="form-message" role="alert">{message}</p>}<div className="form-footer"><Button type="button" className="secondary" onClick={() => router.back()}>Cancel</Button><Button type="submit" disabled={busy}><Plus size={14}/>{busy ? "Saving…" : `Create ${isCustomer ? "customer" : isOrder ? "sales order" : "work order"}`}</Button></div></form></Card></div>;
}
function Field({ label, name = label.toLowerCase().replaceAll(" ", ""), placeholder, type = "text", select, full, required = true }: { label: string; name?: string; placeholder: string; type?: string; select?: string[]; full?: boolean; required?: boolean }) { return <div className={`field ${full ? "full" : ""}`}><label htmlFor={name}>{label}</label>{select ? <select id={name} name={name} required={required} defaultValue=""><option value="" disabled>{placeholder}</option>{select.map(item => <option key={item} value={item}>{item}</option>)}</select> : <input id={name} name={name} required={required} type={type} placeholder={placeholder} min={type === "number" ? 1 : undefined}/>}</div>; }

export function ResourcePage({ path }: { path: string }) {
  const definition = definitions[path]; const router = useRouter();
  if (path === "/customers/create") return <FormPage kind="customer"/>;
  if (path === "/sales-orders/create") return <FormPage kind="order"/>;
  if (path === "/status") return <OrderStatusPage/>;
  if (path === "/create-mo") return <FormPage kind="mo"/>;
  if (!definition) return <ResourceTable path={path}/>;
  return <ResourceTable path={path} definition={definition}/>;
}

function OrderStatusPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]); const [filter, setFilter] = useState(""); const [error, setError] = useState(""); const [busyId, setBusyId] = useState("");
  const load = useCallback(async () => { try { setError(""); setOrders(await apiRequest<SalesOrder[]>("/sales-orders")); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load sales orders."); } }, []);
  useEffect(() => { let active = true; void apiRequest<SalesOrder[]>("/sales-orders").then(rows => { if (active) setOrders(rows); }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load sales orders."); }); return () => { active = false; }; }, []);
  const filteredOrders = useMemo(() => orders.filter(order => `${order.orderNumber} ${order.customerName} ${order.customerReference} ${order.status}`.toLowerCase().includes(filter.toLowerCase())), [orders, filter]);
  async function update(order: SalesOrder, status: "approved" | "cancelled") {
    const action = status === "approved" ? "send this order to Engineering" : "cancel this order";
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    setBusyId(order.id); setError("");
    try { await apiRequest(`/sales-orders/${order.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update order status."); }
    finally { setBusyId(""); }
  }
  return <div className="page-stack"><PageHeading eyebrow="Business development" title="Order status" description="Review customer order progress and hand confirmed orders to Engineering."/><Card className="route-card"><div className="toolbar"><label className="search-box"><Search size={15}/><input aria-label="Search order status" placeholder="Search orders…" value={filter} onChange={event => setFilter(event.target.value)}/></label></div>{error && <div className="load-error" role="alert">{error}</div>}<div className="table-scroll"><table className="resource-table"><thead><tr><th>Order number</th><th>Customer</th><th>Part and quantity</th><th>Required date</th><th>Status</th><th>Action</th></tr></thead><tbody>{filteredOrders.map(order => <tr key={order.id}><td><strong className="table-primary">{order.orderNumber}</strong></td><td>{order.customerName || "—"}</td><td>{order.items.map(item => `${item.partNumber} · ${item.quantity}`).join(", ")}</td><td>{order.requiredDate || "—"}</td><td><StatusBadge status={order.status}/></td><td>{order.status === "pending" ? <div className="order-actions"><Button disabled={busyId === order.id} onClick={() => void update(order, "approved")}><Send size={13}/>Send to Engineering</Button><Button className="secondary" disabled={busyId === order.id} onClick={() => void update(order, "cancelled")}>Cancel</Button></div> : <span className="muted-copy">Status updates as the order progresses</span>}</td></tr>)}</tbody></table>{orders.length === 0 && !error && <div className="empty-state">No sales orders recorded yet. Create an order to begin.</div>}{orders.length > 0 && filteredOrders.length === 0 && <div className="empty-state">No orders match this search.</div>}</div></Card></div>;
}

function ResourceTable({ path, definition = { title: prettify(path), description: "Review, coordinate, and manage this area of your manufacturing operations.", noun: "record", headers: ["Reference", "Description", "Owner", "Updated", "Status"], rows: [] } }: { path: string; definition?: { title: string; description: string; noun: string; headers: string[]; rows: string[][] } }) {
  const [filter, setFilter] = useState(""); const [toast, setToast] = useState(""); const [liveRows, setLiveRows] = useState<string[][] | null>(null); const [loadError, setLoadError] = useState(""); const router = useRouter();
  useEffect(() => { const endpoints: Record<string, string> = { "/customers": "/customers", "/sales-orders": "/sales-orders", "/manufacturing-orders": "/manufacturingOrders", "/machines": "/machines", "/raw-material": "/inventoryItems", "/procurement": "/procurementRequests", "/qaqc/incoming": "/qualityInspections", "/qaqc/inprocess": "/qualityInspections", "/qaqc/outgoing": "/qualityInspections" }; const endpoint = endpoints[path]; if (!endpoint) return; let active = true; void apiRequest<Record<string, unknown>[]>(endpoint).then(data => { if (!active) return; const rows = path === "/customers" ? (data as unknown as Customer[]).map(row => [row.code, row.name, row.email || row.phone || "—", row.active ? "Active" : "Inactive"]) : path === "/sales-orders" ? (data as unknown as SalesOrder[]).map(row => [row.orderNumber, row.customerName || "—", `${row.items.reduce((n, item) => n + item.quantity, 0)} pcs`, row.requiredDate || "—", row.status]) : data.map(row => path === "/manufacturing-orders" ? [String(row.orderNumber), String(row.partNumber), `${row.quantity} pcs`, String(row.plannedFinish ?? "—"), String(row.status)] : path === "/machines" ? [String(row.code), String(row.name), String(row.workCenter ?? "—"), String(row.capacityPerShift ?? "—"), String(row.status)] : path === "/raw-material" ? [String(row.description), String(row.partNumber), `${row.quantityOnHand} ${row.unit}`, String(row.location ?? "—"), Number(row.quantityOnHand) <= Number(row.reorderPoint) ? "Reorder needed" : "Available"] : path === "/procurement" ? [String(row.requestNumber), String(row.description), `${row.quantity}`, String(row.requiredDate ?? "—"), String(row.status)] : [String(row.inspectionNumber), String(row.partNumber), String(row.lotNumber ?? "—"), `${row.quantityInspected}`, String(row.status)]); setLiveRows(rows); }).catch(error => { if (active) setLoadError(error.message); }); return () => { active = false; }; }, [path]);
  const sourceRows = liveRows ?? definition.rows; const rows = useMemo(() => sourceRows.filter(row => row.join(" ").toLowerCase().includes(filter.toLowerCase())), [sourceRows, filter]); const createPath = path === "/customers" ? "/customers/create" : path === "/sales-orders" ? "/sales-orders/create" : path === "/manufacturing-orders" ? "/create-mo" : "";
  return <div className="page-stack"><PageHeading eyebrow="FAMAX MES workspace" title={definition.title} description={definition.description}>{createPath && <Link href={createPath}><Button><Plus size={15}/> New {definition.noun}</Button></Link>}</PageHeading><Card className="route-card"><div className="toolbar"><label className="search-box"><Search size={15}/><input aria-label={`Search ${definition.title}`} placeholder={`Search ${definition.title.toLowerCase()}…`} value={filter} onChange={e => setFilter(e.target.value)}/></label><div className="toolbar-actions"><Button className="secondary" onClick={() => {setFilter(""); setToast("Filters cleared"); window.setTimeout(() => setToast(""), 1800);}}><Settings2 size={14}/> Reset</Button><Button className="secondary" onClick={() => {setToast("Export is available when connected to your MES API."); window.setTimeout(() => setToast(""), 2400);}}><FileText size={14}/> Export</Button></div></div>{loadError && <div className="load-error" role="alert">Live records are unavailable: {loadError}</div>}<div className="table-scroll"><table className="resource-table"><thead><tr>{definition.headers.map(header => <th key={header}>{header}</th>)}<th/></tr></thead><tbody>{rows.map((row,i) => <tr key={`${row[0]}-${i}`}>{row.map((cell,j) => <td key={j}>{j === row.length - 1 ? <StatusBadge status={cell}/> : j === 0 ? <strong className="table-primary">{cell}</strong> : cell}</td>)}<td><button className="row-action" onClick={() => {setToast(`${row[0]} selected`); window.setTimeout(() => setToast(""), 1600);}}>View</button></td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty-state">{loadError ? "Check the API and database connection, then refresh this page." : !liveRows && ["/customers", "/sales-orders", "/manufacturing-orders", "/machines", "/raw-material", "/procurement", "/qaqc/incoming", "/qaqc/inprocess", "/qaqc/outgoing"].includes(path) ? "Loading records…" : filter ? `No ${definition.noun} records match “${filter}”.` : `No ${definition.noun} records yet. Create one to get started.`}</div>}</div></Card>{toast && <div className="toast" role="status">{toast}</div>}</div>;
}
