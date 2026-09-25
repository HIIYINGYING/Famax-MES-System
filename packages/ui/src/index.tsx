import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <section className={clsx("card", className)} {...props}/>; }
export function Button({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={clsx("button", className)} {...props}>{children}</button>; }
export function PageHeading({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return <header className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="heading-actions">{children}</div>}</header>;
}
export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = /complete|passed|approved|active|production/.test(normalized) ? "success" : /hold|attention|reject|overdue|short/.test(normalized) ? "warning" : /pending|review|inspection|scheduled/.test(normalized) ? "info" : "neutral";
  return <span className={`status-badge ${tone}`}><span/>{status}</span>;
}
