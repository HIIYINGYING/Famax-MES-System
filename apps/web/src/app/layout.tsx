import type { Metadata, Viewport } from "next";
import "@famax/ui/globals.css";

export const metadata: Metadata = {
  title: { default: "FAMAX MES | Manufacturing Operations", template: "%s | FAMAX MES" },
  description: "Manufacturing execution, quality, and supply chain operations in one workspace.",
  applicationName: "FAMAX MES",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#111e2d" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
