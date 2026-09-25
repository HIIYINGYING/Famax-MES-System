import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { and, count, desc, eq, inArray, lte } from "drizzle-orm";
import { customers, db, inventoryItems, machines, manufacturingOrders, processPlans, procurementRequests, qualityInspections, salesOrderItems, salesOrders, systemEvents } from "@famax/db";
import { createLogger } from "@famax/observability";

const log = createLogger("mes-service");
const tables = { manufacturingOrders, processPlans, inventoryItems, procurementRequests, qualityInspections, machines } as const;
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
  async updateSalesOrderStatus(id: string, status: "approved" | "cancelled", actor: string) {
    const database = this.database();
    const [current] = await database.select({ status: salesOrders.status }).from(salesOrders).where(eq(salesOrders.id, id)).limit(1);
    if (!current) throw new BadRequestException("Sales order was not found.");
    if (current.status !== "pending") throw new BadRequestException("Only a pending sales order can be sent for engineering review or cancelled.");
    const [updated] = await database.update(salesOrders).set({ status, updatedAt: new Date() }).where(eq(salesOrders.id, id)).returning();
    await log.info("Sales order status changed", { actor, id, status });
    return updated;
  }
  async createProcurementRequest(input: { description: string; quantity: number; requiredDate?: string; supplierName?: string }, actor: string) {
    const description = input.description.trim();
    if (!description || !Number.isInteger(input.quantity) || input.quantity < 1) throw new BadRequestException("Description and a positive whole-number quantity are required.");
    const requestNumber = `PR-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const [created] = await this.database().insert(procurementRequests).values({ requestNumber, description, quantity: input.quantity, requiredDate: input.requiredDate, supplierName: input.supplierName?.trim() || null, status: "pending", requestedBy: actor }).returning();
    await log.info("Procurement request created", { actor, id: created.id, requestNumber });
    return created;
  }
  async updateProcurementStatus(id: string, status: "in_progress" | "approved" | "completed", actor: string) {
    const database = this.database();
    const [current] = await database.select({ status: procurementRequests.status }).from(procurementRequests).where(eq(procurementRequests.id, id)).limit(1);
    if (!current) throw new BadRequestException("Procurement request was not found.");
    const allowed: Record<string, string[]> = { pending: ["in_progress"], in_progress: ["approved"], approved: ["completed"] };
    if (!allowed[current.status]?.includes(status)) throw new BadRequestException(`Cannot change a ${current.status} request to ${status}.`);
    const [updated] = await database.update(procurementRequests).set({ status, updatedAt: new Date() }).where(and(eq(procurementRequests.id, id), eq(procurementRequests.status, current.status))).returning();
    if (!updated) throw new BadRequestException("This request was changed by another user. Refresh and try again.");
    await log.info("Procurement request status changed", { actor, id, status });
    return updated;
  }
  async listQualityInspections(kind: "IQC" | "IPQC" | "OQC") {
    return this.database().select().from(qualityInspections).where(eq(qualityInspections.kind, kind)).orderBy(desc(qualityInspections.createdAt)).limit(250);
  }
  async createQualityInspection(input: { kind: "IQC" | "IPQC" | "OQC"; partNumber: string; lotNumber?: string; quantityInspected: number; manufacturingOrderId?: string }, actor: string) {
    if (!input.partNumber.trim() || !Number.isInteger(input.quantityInspected) || input.quantityInspected < 1) throw new BadRequestException("Part number and a positive inspected quantity are required.");
    const inspectionNumber = `${input.kind}-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const [created] = await this.database().insert(qualityInspections).values({ inspectionNumber, kind: input.kind, partNumber: input.partNumber.trim(), lotNumber: input.lotNumber?.trim() || null, quantityInspected: input.quantityInspected, manufacturingOrderId: input.manufacturingOrderId, status: "pending" }).returning();
    await log.info("Quality inspection created", { actor, id: created.id, inspectionNumber });
    return created;
  }
  async recordInspectionOutcome(id: string, input: { result: "pass" | "fail"; quantityAccepted: number; findings?: string }, actor: string) {
    const database = this.database();
    const [current] = await database.select().from(qualityInspections).where(eq(qualityInspections.id, id)).limit(1);
    if (!current) throw new BadRequestException("Quality inspection was not found.");
    if (current.status !== "pending") throw new BadRequestException("Only a pending inspection can be completed.");
    if (!Number.isInteger(input.quantityAccepted) || input.quantityAccepted < 0 || input.quantityAccepted > current.quantityInspected) throw new BadRequestException("Accepted quantity must be between zero and the inspected quantity.");
    if (input.result === "pass" && input.quantityAccepted !== current.quantityInspected) throw new BadRequestException("A passing inspection must accept all inspected quantity.");
    if (input.result === "fail" && !input.findings?.trim()) throw new BadRequestException("Add inspection findings before recording a failure.");
    const [updated] = await database.update(qualityInspections).set({ status: input.result === "pass" ? "approved" : "on_hold", quantityAccepted: input.quantityAccepted, findings: { verdict: input.result, note: input.findings?.trim() ?? "" }, inspectedAt: new Date(), updatedAt: new Date() }).where(and(eq(qualityInspections.id, id), eq(qualityInspections.status, "pending"))).returning();
    if (!updated) throw new BadRequestException("This inspection was changed by another inspector. Refresh and try again.");
    await log.info("Quality inspection outcome recorded", { actor, id, result: input.result });
    return updated;
  }
  async createWorkOrder(input: { orderNumber: string; partNumber: string; quantity: number; plannedStart?: string; plannedFinish?: string; priority?: string; salesOrderId?: string; notes?: string }, actor: string) {
    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 1_000_000) throw new BadRequestException("Quantity must be a whole number between 1 and 1,000,000.");
    const normalized = { ...input, orderNumber: input.orderNumber.trim(), partNumber: input.partNumber.trim() };
    if (!normalized.orderNumber || !normalized.partNumber) throw new BadRequestException("Order number and part number are required.");
    const [created] = await this.database().insert(manufacturingOrders).values({ ...normalized, status: "pending" }).returning();
    await log.info("Manufacturing order created", { actor, orderNumber: created.orderNumber, id: created.id });
    return created;
  }
  async updateWorkOrderStatus(id: string, status: "in_progress" | "on_hold" | "completed" | "cancelled", actor: string) {
    const [updated] = await this.database().update(manufacturingOrders).set({ status, updatedAt: new Date() }).where(eq(manufacturingOrders.id, id)).returning();
    if (!updated) throw new BadRequestException("Manufacturing order was not found.");
    await log.info("Manufacturing order status changed", { actor, id, status });
    return updated;
  }
  async listOperatorTasks(actor: string) {
    const database = this.database();
    const orders = await database.select().from(manufacturingOrders).where(inArray(manufacturingOrders.status, ["pending", "approved", "in_progress", "on_hold"])).orderBy(desc(manufacturingOrders.updatedAt)).limit(100);
    if (!orders.length) return [];
    const events = await database.select({ entityId: systemEvents.entityId, action: systemEvents.action, actorId: systemEvents.actorId }).from(systemEvents).where(and(eq(systemEvents.entityType, "manufacturing_order"), inArray(systemEvents.entityId, orders.map(order => order.id)))).orderBy(desc(systemEvents.occurredAt));
    const latest = new Map<string, string>();
    const acceptedBy = new Map<string, string>();
    for (const event of events) if (event.entityId) { if (!latest.has(event.entityId)) latest.set(event.entityId, event.action); if (event.action === "operator.accept" && event.actorId && !acceptedBy.has(event.entityId)) acceptedBy.set(event.entityId, event.actorId); }
    return orders.filter(order => !acceptedBy.has(order.id) || acceptedBy.get(order.id) === actor).map(order => ({ ...order, latestAction: latest.get(order.id) ?? null }));
  }
  async recordOperatorAction(id: string, input: { action: "accept" | "setup_started" | "production_started" | "cycle_time_updated" | "production_stopped" | "production_resumed" | "completed"; quantity?: number; rejectedQuantity?: number; cycleTimeSeconds?: number; reason?: string }, actor: string) {
    const database = this.database();
    const [current] = await database.select().from(manufacturingOrders).where(eq(manufacturingOrders.id, id)).limit(1);
    if (!current) throw new BadRequestException("Manufacturing order was not found.");
    const transitions = { accept: ["pending"], setup_started: ["approved"], production_started: ["approved"], cycle_time_updated: ["in_progress"], production_stopped: ["in_progress"], production_resumed: ["on_hold"], completed: ["in_progress", "on_hold"] } as const;
    if (!(transitions[input.action] as readonly string[]).includes(current.status)) throw new BadRequestException(`Action ${input.action} is not available while this order is ${current.status}.`);
    const [previousEvent] = await database.select({ action: systemEvents.action }).from(systemEvents).where(and(eq(systemEvents.entityType, "manufacturing_order"), eq(systemEvents.entityId, id))).orderBy(desc(systemEvents.occurredAt)).limit(1);
    if (input.action === "setup_started" && previousEvent?.action === "operator.setup_started") throw new BadRequestException("Machine setup has already been started for this order.");
    if (input.action === "production_started" && previousEvent?.action !== "operator.setup_started") throw new BadRequestException("Record the machine setup start before starting production.");
    if (["completed", "production_stopped"].includes(input.action) && (!Number.isInteger(input.quantity) || (input.quantity ?? 0) < 0)) throw new BadRequestException("Enter a valid whole-number production quantity.");
    if (input.rejectedQuantity !== undefined && (!Number.isInteger(input.rejectedQuantity) || input.rejectedQuantity < 0)) throw new BadRequestException("Rejected quantity must be zero or greater.");
    if (input.quantity !== undefined && input.quantity > current.quantity) throw new BadRequestException("Recorded production cannot exceed the work-order quantity.");
    if (input.rejectedQuantity !== undefined && input.quantity !== undefined && input.rejectedQuantity > input.quantity) throw new BadRequestException("Rejected quantity cannot exceed the number produced.");
    if ((input.rejectedQuantity ?? 0) > 0 && !input.reason?.trim() && input.action === "production_stopped") throw new BadRequestException("Provide a reason when recording rejected parts.");
    if (input.cycleTimeSeconds !== undefined && (!Number.isFinite(input.cycleTimeSeconds) || input.cycleTimeSeconds <= 0)) throw new BadRequestException("Cycle time must be greater than zero.");
    const status = input.action === "accept" ? "approved" : input.action === "production_started" || input.action === "production_resumed" ? "in_progress" : input.action === "production_stopped" ? "on_hold" : input.action === "completed" ? "completed" : current.status;
    const eventDetails = { ...input, at: new Date().toISOString() };
    const result = await database.transaction(async tx => {
      const [locked] = await tx.select().from(manufacturingOrders).where(eq(manufacturingOrders.id, id)).for("update");
      if (!locked || locked.status !== current.status) throw new BadRequestException("This work order was changed by another operator. Refresh your task list and try again.");
      const [lockedPreviousEvent] = await tx.select({ action: systemEvents.action }).from(systemEvents).where(and(eq(systemEvents.entityType, "manufacturing_order"), eq(systemEvents.entityId, id))).orderBy(desc(systemEvents.occurredAt)).limit(1);
      if (input.action === "setup_started" && lockedPreviousEvent?.action === "operator.setup_started") throw new BadRequestException("Machine setup has already been started for this order.");
      if (input.action === "production_started" && lockedPreviousEvent?.action !== "operator.setup_started") throw new BadRequestException("Record the machine setup start before starting production.");
      const [order] = await tx.update(manufacturingOrders).set({ status, completedQuantity: input.action === "completed" || input.action === "production_stopped" ? input.quantity : current.completedQuantity, updatedAt: new Date() }).where(and(eq(manufacturingOrders.id, id), eq(manufacturingOrders.status, current.status))).returning();
      if (!order) throw new BadRequestException("This work order was changed by another operator. Refresh your task list and try again.");
      const [event] = await tx.insert(systemEvents).values({ actorId: actor, action: `operator.${input.action}`, entityType: "manufacturing_order", entityId: id, details: eventDetails }).returning();
      return { order, event };
    });
    await log.info("Operator work-order action recorded", { actor, id, action: input.action });
    return result;
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
