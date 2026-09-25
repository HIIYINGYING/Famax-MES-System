import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { and, count, desc, eq, lte } from "drizzle-orm";
import { customers, db, inventoryItems, machines, manufacturingOrders, procurementRequests, qualityInspections, salesOrderItems, salesOrders } from "@famax/db";
import { createLogger } from "@famax/observability";

const log = createLogger("mes-service");
const tables = { manufacturingOrders, inventoryItems, procurementRequests, qualityInspections, machines } as const;
export type ResourceName = keyof typeof tables;

@Injectable()
export class MesService {
  private database() { if (!process.env.DATABASE_URL) throw new ServiceUnavailableException("MES database is not configured. Set DATABASE_URL to enable live records."); return db; }
  async list(resource: ResourceName, limit = 100) { const table = tables[resource]; return this.database().select().from(table).limit(Math.min(limit, 250)); }
  async listCustomers() { return this.database().select().from(customers).orderBy(desc(customers.createdAt)).limit(250); }
  async createCustomer(input: { name: string; email?: string; phone?: string; address?: string }, actor: string) {
    const name = input.name.trim();
    if (!name) throw new BadRequestException("Customer name is required.");
    const [created] = await this.database().insert(customers).values({ code: `CUS-${Date.now().toString(36).toUpperCase()}`, name, email: input.email?.trim() || null, phone: input.phone?.trim() || null, address: input.address?.trim() || null }).returning();
    await log.info("Customer created", { actor, id: created.id, code: created.code });
    return created;
  }
  async listSalesOrders() {
    const database = this.database();
    const orders = await database.select({ id: salesOrders.id, orderNumber: salesOrders.orderNumber, customerId: salesOrders.customerId, customerName: customers.name, customerReference: salesOrders.customerReference, requiredDate: salesOrders.requiredDate, status: salesOrders.status, currency: salesOrders.currency, notes: salesOrders.notes, createdAt: salesOrders.createdAt }).from(salesOrders).leftJoin(customers, eq(salesOrders.customerId, customers.id)).orderBy(desc(salesOrders.createdAt)).limit(250);
    return Promise.all(orders.map(async order => ({ ...order, items: await database.select().from(salesOrderItems).where(eq(salesOrderItems.salesOrderId, order.id)) })));
  }
  async createSalesOrder(input: { customerId: string; customerReference?: string; requiredDate?: string; currency?: string; partNumber: string; description?: string; quantity: number; notes?: string }, actor: string) {
    if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new BadRequestException("Quantity must be a positive whole number.");
    const database = this.database();
    const [customer] = await database.select({ id: customers.id }).from(customers).where(eq(customers.id, input.customerId)).limit(1);
    if (!customer) throw new BadRequestException("Select a valid customer.");
    const orderNumber = `SO-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const created = await database.transaction(async tx => {
      const [order] = await tx.insert(salesOrders).values({ orderNumber, customerId: input.customerId, customerReference: input.customerReference?.trim() || null, requiredDate: input.requiredDate, currency: input.currency ?? "MYR", notes: input.notes?.trim() || null, status: "pending" }).returning();
      const [item] = await tx.insert(salesOrderItems).values({ salesOrderId: order.id, lineNumber: 1, partNumber: input.partNumber.trim(), description: input.description?.trim() || null, quantity: input.quantity }).returning();
      return { ...order, customerName: "", items: [item] };
    });
    await log.info("Sales order created", { actor, id: created.id, orderNumber });
    return { ...created, customerName: (await database.select({ name: customers.name }).from(customers).where(eq(customers.id, input.customerId)).then(rows => rows[0]?.name ?? "")) };
  }
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
    const [orders, materials, inspections, requests, activeOrderCount, pendingOrderCount, lowStockCount, pendingInspectionCount] = await Promise.all([
      database.select().from(manufacturingOrders).orderBy(desc(manufacturingOrders.updatedAt)).limit(8),
      database.select().from(inventoryItems).limit(5),
      database.select().from(qualityInspections).limit(5),
      database.select().from(procurementRequests).where(and(eq(procurementRequests.status, "pending"))).limit(5),
      database.select({ value: count() }).from(manufacturingOrders).where(eq(manufacturingOrders.status, "in_progress")),
      database.select({ value: count() }).from(salesOrders).where(eq(salesOrders.status, "pending")),
      database.select({ value: count() }).from(inventoryItems).where(lte(inventoryItems.quantityOnHand, inventoryItems.reorderPoint)),
      database.select({ value: count() }).from(qualityInspections).where(eq(qualityInspections.status, "pending")),
    ]);
    return { orders, materials, inspections, pendingProcurement: requests.length, metrics: { activeOrders: activeOrderCount[0]?.value ?? 0, pendingOrders: pendingOrderCount[0]?.value ?? 0, lowStock: lowStockCount[0]?.value ?? 0, inspectionsPending: pendingInspectionCount[0]?.value ?? 0 } };
  }
}
