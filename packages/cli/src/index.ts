#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";
import { db, manufacturingOrders } from "@famax/db";
import { desc } from "drizzle-orm";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const healthCommand = defineCommand({ meta: { name: "health", description: "Check MES API and database availability" }, async run() {
  const url = process.env.MES_API_URL ?? "http://localhost:4000";
  try { const response = await fetch(`${url}/health/ready`, { signal: AbortSignal.timeout(4000) }); console.log(await response.text()); if (!response.ok) process.exitCode = 1; }
  catch (error) { console.error(`MES API is unavailable at ${url}: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }
} });
const workOrdersCommand = defineCommand({ meta: { name: "work-orders", description: "List recent manufacturing orders" }, async run() {
  if (!process.env.DATABASE_URL) { console.error("Set DATABASE_URL to query MES work orders."); process.exitCode = 1; return; }
  const rows = await db.select().from(manufacturingOrders).orderBy(desc(manufacturingOrders.createdAt)).limit(25);
  console.table(rows.map(({ orderNumber, partNumber, quantity, status, plannedFinish }) => ({ orderNumber, partNumber, quantity, status, plannedFinish })));
} });
const mcpCommand = defineCommand({ meta: { name: "mcp", description: "Start the local MES stdio MCP server" }, async run() {
  const server = new McpServer({ name: "famax-mes", version: "1.0.0" });
  // The SDK's variadic tool overload becomes recursively deep with Drizzle's inferred return types.
  // Keep the schema concrete and defer the handler's JSON result typing to the MCP boundary.
  // @ts-expect-error SDK tool overload hits TS2589 with the project-wide strict type settings.
  server.tool("list_work_orders", "List recent MES manufacturing work orders", { limit: z.number().int().min(1).max(100).optional() }, async ({ limit }) => {
    if (!process.env.DATABASE_URL) return { isError: true, content: [{ type: "text", text: "DATABASE_URL is required to query the MES database." }] };
    const rows = await db.select().from(manufacturingOrders).orderBy(desc(manufacturingOrders.createdAt)).limit(limit ?? 25);
    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  });
  await server.connect(new StdioServerTransport());
} });
const main = defineCommand({ meta: { name: "famax-mes", version: "1.0.0", description: "FAMAX MES command line and MCP tools" }, subCommands: { health: healthCommand, "work-orders": workOrdersCommand, mcp: mcpCommand } });
runMain(main);
