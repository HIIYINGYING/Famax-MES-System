import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db, inventoryItems, manufacturingOrders, qualityInspections } from "@famax/db";

export function createMesMcpServer() {
  const server = new McpServer({ name: "famax-mes", version: "1.0.0" });
  // MCP's tool overload hits TS2589 when inferring the Drizzle row result type.
  // @ts-expect-error Keep the validated input contract while serializing rows at the MCP boundary.
  server.tool("list_work_orders", "List recent manufacturing orders and their current status", { limit: z.number().int().min(1).max(100).optional() }, async ({ limit }) => {
    const rows = await db.select().from(manufacturingOrders).limit(limit ?? 25);
    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  });
  server.tool("list_material_alerts", "List inventory items at or below their reorder point", {}, async () => {
    const rows = await db.select().from(inventoryItems).limit(100);
    const alerts = rows.filter(item => item.quantityOnHand <= item.reorderPoint);
    return { content: [{ type: "text", text: JSON.stringify(alerts) }] };
  });
  server.tool("list_quality_inspections", "List recent incoming, in-process, and outgoing quality inspections", { limit: z.number().int().min(1).max(100).optional() }, async ({ limit }) => {
    const rows = await db.select().from(qualityInspections).limit(limit ?? 25);
    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  });
  return server;
}
