import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Boxes, ClipboardCheck, Factory, PackageCheck, Plus, ScanLine, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button, Card, PageHeading, StatusBadge } from "@famax/ui";

const orders = [
  { id: "MO-260924-018", part: "Precision Housing · PH-4402", customer: "Apex Motion Systems", progress: 82, due: "Today, 16:00", status: "In production" },
  { id: "MO-260924-017", part: "Valve Body · VB-1806", customer: "NexGen Robotics", progress: 64, due: "Today, 18:30", status: "In production" },
  { id: "MO-260923-041", part: "Drive Shaft · DS-2010", customer: "Apex Motion Systems", progress: 100, due: "Tomorrow", status: "Quality check" },
  { id: "MO-260923-039", part: "Mounting Bracket · MB-7301", customer: "Orion Industrial", progress: 38, due: "Sep 26", status: "In production" },
];

const metrics = [
  { label: "Active work orders", value: "24", note: "+3 from yesterday", positive: true, icon: Factory, tone: "blue" },
  { label: "On-time delivery", value: "96.8%", note: "+2.4% this month", positive: true, icon: TrendingUp, tone: "green" },
  { label: "Quality pass rate", value: "99.2%", note: "Within target", positive: true, icon: ClipboardCheck, tone: "violet" },
  { label: "Material alerts", value: "03", note: "Needs attention", positive: false, icon: Boxes, tone: "amber" },
];

export default function DashboardPage() {
  return <div className="page-stack">
    <PageHeading eyebrow="Wednesday, September 24, 2026" title="Good morning, team" description="Here’s what’s happening across your production floor today.">
      <Link href="/create-mo"><Button><Plus size={16} /> New work order</Button></Link>
    </PageHeading>
    <div className="metrics-grid">{metrics.map(({ label, value, note, positive, icon: Icon, tone }) => <Card className="metric-card" key={label}><div className="metric-top"><span className="metric-label">{label}</span><span className={`metric-icon ${tone}`}><Icon size={18}/></span></div><div className="metric-value">{value}</div><div className={`metric-note ${positive ? "positive" : "attention"}`}>{positive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {note}</div></Card>)}</div>
    <div className="dashboard-grid">
      <Card className="orders-card"><div className="card-heading"><div><h2>Production overview</h2><p>Live status of active manufacturing orders</p></div><Link className="text-link" href="/manufacturing-orders">All work orders <ArrowRight size={15}/></Link></div>
        <div className="table-scroll"><table><thead><tr><th>Work order</th><th>Customer</th><th>Progress</th><th>Due</th><th>Status</th></tr></thead><tbody>{orders.map(order => <tr key={order.id}><td><Link href="/manufacturing-orders" className="order-link">{order.id}<span>{order.part}</span></Link></td><td>{order.customer}</td><td><div className="progress-cell"><div className="progress-track"><span style={{width:`${order.progress}%`}}/></div><span>{order.progress}%</span></div></td><td>{order.due}</td><td><StatusBadge status={order.status}/></td></tr>)}</tbody></table></div>
      </Card>
      <Card className="activity-card"><div className="card-heading"><div><h2>Floor activity</h2><p>Updates from the last 2 hours</p></div><Activity size={18} className="muted-icon"/></div><div className="activity-list"><div className="activity-item"><span className="activity-mark green"><PackageCheck size={15}/></span><div><strong>Incoming inspection passed</strong><p>Aluminium billet · RM-0382 · Lot L-24094</p><time>8 min ago · Receiving</time></div></div><div className="activity-item"><span className="activity-mark blue"><ScanLine size={15}/></span><div><strong>Operation completed</strong><p>MO-260924-018 · CNC Turning · Machine C-04</p><time>34 min ago · Production</time></div></div><div className="activity-item"><span className="activity-mark amber"><ClipboardCheck size={15}/></span><div><strong>Quality check requested</strong><p>MO-260923-041 · Final dimensional inspection</p><time>1 hr ago · Quality</time></div></div></div><Link className="activity-footer" href="/system-log">View activity log <ArrowRight size={14}/></Link></Card>
    </div>
    <div className="shift-banner"><span className="shift-icon"><Factory size={18}/></span><div><strong>Shift A is running smoothly</strong><p>18 operators active · 12 of 14 machines online · Last sync just now</p></div><span className="live-dot"/><span className="shift-live">Live</span></div>
  </div>;
}
