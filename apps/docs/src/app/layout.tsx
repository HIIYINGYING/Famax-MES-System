import type { Metadata } from "next"; import "@famax/ui/globals.css"; import "./docs.css";
export const metadata: Metadata = { title: "MES Documentation | FAMAX", description: "Guides for configuring and operating the FAMAX MES." };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
