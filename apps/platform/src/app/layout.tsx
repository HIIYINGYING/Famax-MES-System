import type { Metadata } from "next"; import "@famax/ui/globals.css";
export const metadata: Metadata = { title: "Platform administration | FAMAX", description: "FAMAX MES administration workspace." };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
