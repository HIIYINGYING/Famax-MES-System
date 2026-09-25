import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { customers, db, inventoryItems, manufacturingOrders, procurementRequests, qualityInspections, salesOrders } from "@famax/db";
import { createLogger } from "@famax/observability";

const log = createLogger("mes-service");
const tables = { customers, salesOrders, manufacturingOrders, inventoryItems, procurementRequests, qualityInspections } as const;
export type ResourceName = keyof typeof tables;

@Injectable()
export class MesService {
  private database() { if (!process.env.DATABASE_URL) throw new ServiceUnavailableException("MES database is not configured. Set DATABASE_URL to enable live records."); return db; }
  async list(resource: ResourceName, limit = 100) { const table = tables[resource]; return this.database().select().from(table).limit(Math.min(limit, 250)); }
  async createWorkOrder(input: { orderNumber: string; partNumber: string; quantity: number; plannedStart?: string; plannedFinish?: string; priority?: string; salesOrderId?: string; notes?: string }, actor: string) {
    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 1_000_000) throw new BadRequestException("Quantity must be a whole number between 1 and 1,000,000.");
    const normalized = { ...input, orderNumber: input.orderNumber.trim(), partNumber: input.partNumber.trim() };
    if (!normalized.orderNumber || !normalized.partNumber) throw new BadRequestException("Order number and part number are required.");
    const [created] = await this.database().insert(manufacturingOrders).values({ ...normalized, status: "draft" }).returning();
    await log.info("Manufacturing order created", { actor, orderNumber: created.orderNumber, id: created.id });
    return created;
  }
  async updateWorkOrderStatus(id: string, status: "in_progress" | "on_hold" | "completed" | "cancelled", actor: string) {
    const [updated] = await this.database().update(manufacturingOrders).set({ status, updatedAt: new Date() }).where(eq(manufacturingOrders.id, id)).returning();
    if (!updated) throw new BadRequestException("Manufacturing order was not found.");
    await log.info("Manufacturing order status changed", { actor, id, status });
    return updated;
  }
  async dashboard() {
    const database = this.database();
    const [orders, materials, inspections, requests] = await Promise.all([
      database.select().from(manufacturingOrders).orderBy(desc(manufacturingOrders.updatedAt)).limit(8),
      database.select().from(inventoryItems).limit(5),
      database.select().from(qualityInspections).limit(5),
      database.select().from(procurementRequests).where(and(eq(procurementRequests.status, "pending"))).limit(5),
    ]);
    return { orders, materials, inspections, pendingProcurement: requests.length };
  }
}
