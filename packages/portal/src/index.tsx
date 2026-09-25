"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Bell, Boxes, BriefcaseBusiness, Building2, CalendarDays, Check, ChevronDown, ClipboardCheck, ClipboardList, Cog, FileText, Gauge, HardHat, LayoutDashboard, LogOut, Menu, Package, PackageSearch, Plus, Search, Settings2, ShieldAlert, Truck, Users, Wrench } from "lucide-react";
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
  "/customers": { title: "Customers", description: "Manage customer relationships and account details.", noun: "customer", headers: ["Customer", "Contact", "Open orders", "Status"], rows: [["Apex Motion Systems", "procurement@apexmotion.com", "8", "Active"], ["NexGen Robotics", "supply@nexgenrobotics.com", "5", "Active"], ["Orion Industrial", "orders@orionindustrial.com", "3", "Active"]] },
  "/sales-orders": { title: "Sales orders", description: "Track customer demand from order entry through delivery.", noun: "sales order", headers: ["Order", "Customer", "Items", "Required date", "Status"], rows: [["SO-260924-031", "Apex Motion Systems", "3 lines", "Sep 30, 2026", "In production"], ["SO-260923-028", "NexGen Robotics", "2 lines", "Oct 02, 2026", "Confirmed"], ["SO-260922-024", "Orion Industrial", "5 lines", "Oct 05, 2026", "Pending review"]] },
  "/manufacturing-orders": { title: "Manufacturing orders", description: "Coordinate every work order from release to quality approval.", noun: "work order", headers: ["Work order", "Part / description", "Customer", "Quantity", "Status"], rows: [["MO-260924-018", "PH-4402 · Precision Housing", "Apex Motion Systems", "240 pcs", "In production"], ["MO-260924-017", "VB-1806 · Valve Body", "NexGen Robotics", "120 pcs", "In production"], ["MO-260923-041", "DS-2010 · Drive Shaft", "Apex Motion Systems", "500 pcs", "Quality check"]] },
  "/machines": { title: "Machines", description: "Monitor equipment availability and production capacity.", noun: "machine", headers: ["Machine", "Work center", "Current order", "Utilization", "Status"], rows: [["CNC-04", "CNC Turning", "MO-260924-018", "86%", "Active"], ["CNC-02", "CNC Milling", "MO-260924-017", "72%", "Active"], ["INS-01", "Inspection", "—", "—", "Maintenance"]] },
  "/procurement": { title: "Procurement", description: "Track purchase requests, supplier commitments, and inbound materials.", noun: "purchase request", headers: ["Request", "Material", "Supplier", "Required by", "Status"], rows: [["PR-260924-012", "Aluminium billet 6061", "MetalSource Sdn Bhd", "Sep 27, 2026", "Approved"], ["PR-260924-011", "Carbide insert CNMG", "Toolworks Asia", "Sep 28, 2026", "Pending review"], ["PR-260923-009", "Hydraulic coolant 20L", "Industrial Supply Co.", "Sep 30, 2026", "Ordered"]] },
  "/raw-material": { title: "Raw material inventory", description: "Review available stock, lot traceability, and replenishment needs.", noun: "material", headers: ["Material", "Part number", "On hand", "Reorder point", "Status"], rows: [["Aluminium billet 6061", "RM-0382", "1,240 kg", "500 kg", "Available"], ["Stainless bar 304", "RM-0214", "180 kg", "250 kg", "Reorder needed"], ["Cold rolled steel", "RM-0158", "760 kg", "300 kg", "Available"]] },
  "/my-tasks": { title: "My production tasks", description: "Your assigned operations, due times, and work instructions.", noun: "task", headers: ["Operation", "Work order", "Machine", "Due", "Status"], rows: [["CNC turning · Op 20", "MO-260924-018", "CNC-04", "11:30 AM", "In production"], ["Dimensional check · Op 30", "MO-260923-041", "QC bench 2", "1:00 PM", "Pending review"], ["Deburr · Op 10", "MO-260924-019", "Finishing", "3:30 PM", "Scheduled"]] },
  "/qaqc/incoming": { title: "Incoming inspection", description: "Inspect purchased materials before they enter production stock.", noun: "inspection", headers: ["Inspection", "Material / lot", "Supplier", "Received", "Status"], rows: [["IQC-260924-008", "RM-0382 · L-24094", "MetalSource Sdn Bhd", "Today, 08:12", "Passed"], ["IQC-260924-007", "RM-0214 · L-24088", "Steel Centre", "Today, 07:45", "Pending review"]] },
  "/qaqc/inprocess": { title: "In-process inspection", description: "Review quality checks recorded during active production operations.", noun: "inspection", headers: ["Inspection", "Work order", "Operation", "Inspector", "Status"], rows: [["IPQC-260924-014", "MO-260924-018", "CNC turning · Op 20", "S. Tan", "Passed"], ["IPQC-260924-013", "MO-260924-017", "Milling · Op 10", "A. Lim", "Pending review"]] },
  "/qaqc/outgoing": { title: "Outgoing inspection", description: "Verify finished goods before release and customer shipment.", noun: "inspection", headers: ["Inspection", "Work order", "Quantity", "Customer", "Status"], rows: [["OQC-260923-004", "MO-260923-041", "500 pcs", "Apex Motion Systems", "Pending review"], ["OQC-260922-003", "MO-260922-036", "180 pcs", "Orion Industrial", "Passed"]] },
};

function FormPage({ kind }: { kind: "order" | "mo" }) {
  const router = useRouter(); const [saved, setSaved] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setSaved(true); window.setTimeout(() => router.push(kind === "order" ? "/sales-orders" : "/manufacturing-orders"), 1100); }
  const isOrder = kind === "order"; const title = isOrder ? "Create sales order" : "Create manufacturing order";
  return <div className="page-stack"><PageHeading eyebrow="Order management" title={title} description={isOrder ? "Capture customer demand and required delivery details." : "Release production work with a traceable order and routing."}/><Card><form onSubmit={submit}><div className="form-grid"><Field label={isOrder ? "Customer" : "Sales order"} placeholder={isOrder ? "Select a customer" : "Select a sales order"} select={isOrder ? ["Apex Motion Systems", "NexGen Robotics", "Orion Industrial"] : ["SO-260924-031", "SO-260923-028"]}/><Field label={isOrder ? "Customer reference" : "Part number"} placeholder={isOrder ? "Purchase order number" : "e.g. PH-4402"}/><Field label={isOrder ? "Required delivery" : "Planned start date"} placeholder="" type="date"/><Field label={isOrder ? "Currency" : "Planned completion"} placeholder="" type={isOrder ? "text" : "date"}/><Field label={isOrder ? "Part number" : "Planned quantity"} placeholder={isOrder ? "e.g. PH-4402" : "Enter quantity"}/><Field label={isOrder ? "Quantity" : "Priority"} placeholder={isOrder ? "Enter quantity" : "Select priority"} select={isOrder ? undefined : ["Normal", "High", "Urgent"]}/><Field label="Notes" placeholder="Add instructions or reference details" full/></div><div className="form-footer"><Button type="button" className="secondary" onClick={() => router.back()}>Cancel</Button><Button type="submit"><Plus size={14}/> Create {isOrder ? "sales order" : "work order"}</Button></div></form></Card>{saved && <div className="toast" role="status">Saved locally. Connect the MES API to persist this record.</div>}</div>;
}
function Field({ label, placeholder, type = "text", select, full }: { label: string; placeholder: string; type?: string; select?: string[]; full?: boolean }) { return <div className={`field ${full ? "full" : ""}`}><label>{label}</label>{select ? <select required defaultValue=""><option value="" disabled>{placeholder}</option>{select.map(item => <option key={item}>{item}</option>)}</select> : <input required={label !== "Notes"} type={type} placeholder={placeholder}/>}</div>; }

export function ResourcePage({ path }: { path: string }) {
  const definition = definitions[path]; const router = useRouter();
  if (path === "/sales-orders/create") return <FormPage kind="order"/>;
  if (path === "/create-mo") return <FormPage kind="mo"/>;
  if (!definition) return <ResourceTable path={path}/>;
  return <ResourceTable path={path} definition={definition}/>;
}

function ResourceTable({ path, definition = { title: prettify(path), description: "Review, coordinate, and manage this area of your manufacturing operations.", noun: "record", headers: ["Reference", "Description", "Owner", "Updated", "Status"], rows: [["FM-260924-001", `${prettify(path)} operational record`, "Production team", "Today, 09:15", "Active"], ["FM-260923-014", "Awaiting review and confirmation", "Operations", "Yesterday", "Pending review"], ["FM-260922-008", "Completed production activity", "Quality team", "Sep 22, 2026", "Complete"]] } }: { path: string; definition?: { title: string; description: string; noun: string; headers: string[]; rows: string[][] } }) {
  const [filter, setFilter] = useState(""); const [toast, setToast] = useState(""); const router = useRouter(); const rows = useMemo(() => definition.rows.filter(row => row.join(" ").toLowerCase().includes(filter.toLowerCase())), [definition.rows, filter]); const createPath = path === "/sales-orders" ? "/sales-orders/create" : path === "/manufacturing-orders" ? "/create-mo" : "";
  return <div className="page-stack"><PageHeading eyebrow="FAMAX MES workspace" title={definition.title} description={definition.description}>{createPath && <Link href={createPath}><Button><Plus size={15}/> New {definition.noun}</Button></Link>}</PageHeading><Card className="route-card"><div className="toolbar"><label className="search-box"><Search size={15}/><input aria-label={`Search ${definition.title}`} placeholder={`Search ${definition.title.toLowerCase()}…`} value={filter} onChange={e => setFilter(e.target.value)}/></label><div className="toolbar-actions"><Button className="secondary" onClick={() => {setFilter(""); setToast("Filters cleared"); window.setTimeout(() => setToast(""), 1800);}}><Settings2 size={14}/> Reset</Button><Button className="secondary" onClick={() => {setToast("Export is available when connected to your MES API."); window.setTimeout(() => setToast(""), 2400);}}><FileText size={14}/> Export</Button></div></div><div className="table-scroll"><table className="resource-table"><thead><tr>{definition.headers.map(header => <th key={header}>{header}</th>)}<th/></tr></thead><tbody>{rows.map((row,i) => <tr key={`${row[0]}-${i}`}>{row.map((cell,j) => <td key={j}>{j === row.length - 1 ? <StatusBadge status={cell}/> : j === 0 ? <strong className="table-primary">{cell}</strong> : cell}</td>)}<td><button className="row-action" onClick={() => {setToast(`${row[0]} selected`); window.setTimeout(() => setToast(""), 1600);}}>View</button></td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty-state">No {definition.noun} records match “{filter}”.</div>}</div></Card>{toast && <div className="toast" role="status">{toast}</div>}</div>;
}
