"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, Boxes, ClipboardCheck, Factory, PackageCheck, Plus, RefreshCw, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button, Card, PageHeading, StatusBadge } from "@famax/ui";

type DashboardData = {
  orders: { id: string; orderNumber: string; partNumber: string; quantity: number; completedQuantity: number; plannedFinish: string | null; status: string }[];
  inspections: { inspectionNumber: string; kind: string; partNumber: string; status: string }[];
  pendingProcurement: number;
  metrics: { activeOrders: number; pendingOrders: number; lowStock: number; inspectionsPending: number };
};
const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
async function getDashboardData() {
  const response = await fetch(`${apiBase}/dashboard`, { credentials: "include" });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message ?? "The MES service could not load dashboard information."); }
  return response.json() as Promise<DashboardData>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setRefreshing(true); setError("");
    try { setData(await getDashboardData()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to connect to the MES service."); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => { void getDashboardData().then(setData).catch(cause => setError(cause instanceof Error ? cause.message : "Unable to connect to the MES service.")); }, []);

  const metrics = data ? [
    { label: "Active work orders", value: data.metrics.activeOrders, note: "Currently in production", icon: Factory, tone: "blue", href: "/manufacturing-orders" },
    { label: "Orders under review", value: data.metrics.pendingOrders, note: "Awaiting next action", icon: TrendingUp, tone: "green", href: "/sales-orders" },
    { label: "Inspections pending", value: data.metrics.inspectionsPending, note: "Quality team follow-up", icon: ClipboardCheck, tone: "violet", href: "/qaqc/incoming" },
    { label: "Stock at reorder point", value: data.metrics.lowStock, note: "Review material availability", icon: Boxes, tone: "amber", href: "/raw-material" },
  ] : [];
  return <div className="page-stack">
    <PageHeading eyebrow={new Intl.DateTimeFormat(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date())} title="Production overview" description="Review current work, open quality checks, and material availability.">
      <div className="heading-actions"><Button className="secondary" onClick={() => void load()} disabled={refreshing}><RefreshCw size={14}/>{refreshing ? "Updating…" : "Refresh"}</Button><Link href="/create-mo"><Button><Plus size={16}/> New work order</Button></Link></div>
    </PageHeading>
    {error && <Card className="dashboard-error"><AlertTriangle size={17}/><div><strong>Dashboard data is unavailable</strong><p>{error}</p><span>Confirm the API and database are running, then refresh.</span></div></Card>}
    <div className="metrics-grid">{metrics.map(({ label, value, note, icon: Icon, tone, href }) => <Link href={href} key={label}><Card className="metric-card"><div className="metric-top"><span className="metric-label">{label}</span><span className={`metric-icon ${tone}`}><Icon size={18}/></span></div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></Card></Link>)}{!data && !error && [1, 2, 3, 4].map(key => <Card className="metric-card metric-loading" key={key}>Loading current totals…</Card>)}</div>
    <div className="dashboard-grid">
      <Card className="orders-card"><div className="card-heading"><div><h2>Manufacturing orders</h2><p>Recent work orders from the live MES database</p></div><Link className="text-link" href="/manufacturing-orders">View orders <ArrowRight size={15}/></Link></div>
        <div className="table-scroll"><table><thead><tr><th>Work order</th><th>Part number</th><th>Progress</th><th>Planned finish</th><th>Status</th></tr></thead><tbody>{data?.orders.map(order => { const progress = order.quantity > 0 ? Math.min(100, Math.round(order.completedQuantity / order.quantity * 100)) : 0; return <tr key={order.id}><td><Link href="/manufacturing-orders" className="order-link">{order.orderNumber}</Link></td><td>{order.partNumber}</td><td><div className="progress-cell"><div className="progress-track"><span style={{ width: `${progress}%` }}/></div><span>{progress}%</span></div></td><td>{order.plannedFinish || "Not scheduled"}</td><td><StatusBadge status={order.status}/></td></tr>; })}</tbody></table>{data && data.orders.length === 0 && <div className="empty-state">No manufacturing orders have been recorded yet.</div>}</div>
      </Card>
      <Card className="activity-card"><div className="card-heading"><div><h2>Quality activity</h2><p>Recent inspection records</p></div><Activity size={18} className="muted-icon"/></div><div className="activity-list">{data?.inspections.map(inspection => <div className="activity-item" key={inspection.inspectionNumber}><span className="activity-mark blue"><PackageCheck size={15}/></span><div><strong>{inspection.inspectionNumber} · {inspection.kind.toUpperCase()}</strong><p>{inspection.partNumber}</p><StatusBadge status={inspection.status}/></div></div>)}{data?.inspections.length === 0 && <div className="empty-state">No inspection activity yet.</div>}</div><Link className="activity-footer" href="/inspection-history">View inspection history <ArrowRight size={14}/></Link></Card>
    </div>
    {data && <div className="shift-banner"><span className="shift-icon"><Factory size={18}/></span><div><strong>{data.pendingProcurement} procurement requests awaiting action</strong><p>Check requested materials and update their purchasing progress.</p></div><Link className="text-link" href="/procurement">Review requests <ArrowRight size={14}/></Link></div>}
  </div>;
}
