import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResourcePage } from "@famax/portal";

export const metadata: Metadata = { title: "MES Workspace" };

export default async function RoutePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  if (path === "/dashboard") notFound();
  return <ResourcePage path={path} />;
}
