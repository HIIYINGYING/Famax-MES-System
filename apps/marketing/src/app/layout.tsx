import type { Metadata } from "next"; import "@famax/ui/globals.css"; import "./marketing.css";
export const metadata: Metadata = { title: "FAMAX | Manufacturing, made visible", description: "FAMAX manufacturing execution platform." };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
