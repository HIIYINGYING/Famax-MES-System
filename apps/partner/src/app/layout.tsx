import type { Metadata } from "next"; import "@famax/ui/globals.css";
export const metadata: Metadata = { title: "Partner portal | FAMAX", description: "Order and delivery information for FAMAX partners." };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
