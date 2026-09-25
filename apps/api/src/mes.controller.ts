import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import type { FastifyRequest } from "fastify";
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { MesService } from "./mes.service";
import { SessionGuard } from "./session.guard";

const Actor = createParamDecorator((_data: unknown, context: ExecutionContext) => ((context.switchToHttp().getRequest<FastifyRequest & { user?: { id: string } }>()).user?.id ?? "unknown"));
const MesRole = createParamDecorator((_data: unknown, context: ExecutionContext) => ((context.switchToHttp().getRequest<FastifyRequest & { user?: { mesRole?: string } }>()).user?.mesRole ?? ""));
function requireRole(role: string, ...allowed: string[]) { if (!allowed.includes(role)) throw new ForbiddenException("Your MES role does not have access to this action."); }
class CreateWorkOrderDto {
  @IsString() @MinLength(2) @MaxLength(60) orderNumber!: string;
  @IsString() @MinLength(1) @MaxLength(100) partNumber!: string;
  @IsInt() @Min(1) @Max(1_000_000) quantity!: number;
  @IsOptional() @IsDateString() plannedStart?: string;
  @IsOptional() @IsDateString() plannedFinish?: string;
  @IsOptional() @IsString() @MaxLength(20) priority?: string;
  @IsOptional() @IsString() salesOrderId?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
class UpdateWorkOrderDto { @IsIn(["in_progress", "on_hold", "completed", "cancelled"]) status!: "in_progress" | "on_hold" | "completed" | "cancelled"; }
class ScheduleWorkOrderDto {
  @IsDateString() plannedStart!: string;
  @IsOptional() @IsDateString() plannedFinish?: string;
}
class CreateCustomerDto {
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(2000) address?: string;
}
class CreateSalesOrderDto {
  @IsUUID() customerId!: string;
  @IsOptional() @IsString() @MaxLength(120) customerReference?: string;
  @IsOptional() @IsDateString() requiredDate?: string;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsString() @MinLength(1) @MaxLength(100) partNumber!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
class UpdateSalesOrderStatusDto { @IsIn(["approved", "cancelled"]) status!: "approved" | "cancelled"; }
class OperatorActionDto {
  @IsIn(["accept", "setup_started", "production_started", "cycle_time_updated", "production_stopped", "production_resumed", "completed"]) action!: "accept" | "setup_started" | "production_started" | "cycle_time_updated" | "production_stopped" | "production_resumed" | "completed";
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) quantity?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) rejectedQuantity?: number;
  @IsOptional() @IsInt() @Min(1) @Max(86400) cycleTimeSeconds?: number;
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}
class CreateProcurementDto {
  @IsString() @MinLength(1) @MaxLength(500) description!: string;
  @IsInt() @Min(1) @Max(1_000_000) quantity!: number;
  @IsOptional() @IsDateString() requiredDate?: string;
  @IsOptional() @IsString() @MaxLength(200) supplierName?: string;
}
class UpdateProcurementStatusDto { @IsIn(["in_progress", "approved", "completed"]) status!: "in_progress" | "approved" | "completed"; }
class CreateInspectionDto {
  @IsIn(["IQC", "IPQC", "OQC"]) kind!: "IQC" | "IPQC" | "OQC";
  @IsString() @MinLength(1) @MaxLength(100) partNumber!: string;
  @IsOptional() @IsString() @MaxLength(100) lotNumber?: string;
  @IsInt() @Min(1) @Max(1_000_000) quantityInspected!: number;
  @IsOptional() @IsUUID() manufacturingOrderId?: string;
}
class InspectionOutcomeDto {
  @IsIn(["pass", "fail"]) result!: "pass" | "fail";
  @IsInt() @Min(0) @Max(1_000_000) quantityAccepted!: number;
  @IsOptional() @IsString() @MaxLength(2000) findings?: string;
}
class ProcessStepDto {
  @IsString() @MinLength(1) @MaxLength(150) operation!: string;
  @IsString() @MinLength(1) @MaxLength(150) workCenter!: string;
  @IsInt() @Min(1) @Max(999) sequence!: number;
}
class CreateProcessPlanDto {
  @IsString() @MinLength(1) @MaxLength(100) partNumber!: string;
  @IsOptional() @IsString() @MaxLength(20) revision?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ProcessStepDto) steps!: ProcessStepDto[];
}
class UpdateProcessPlanStatusDto { @IsIn(["pending", "approved"]) status!: "pending" | "approved"; }
class UpdateUserAccessDto {
  @IsIn(["ADMIN", "BD", "ENG", "OPERATOR", "SCM", "PRODUCTION_PLANNER", "QC", "MANAGEMENT"]) mesRole!: string;
  @IsBoolean() banned!: boolean;
}
const resourceNames = ["manufacturingOrders", "processPlans", "inventoryItems", "procurementRequests", "machines"] as const;

@Controller()
@UseGuards(SessionGuard)
export class MesController {
  constructor(private readonly mes: MesService) {}
  @Get("dashboard") dashboard() { return this.mes.dashboard(); }
  @Get("users") users(@MesRole() role: string) { if (role !== "ADMIN") throw new ForbiddenException("Administrator access is required to view user accounts."); return this.mes.listUsers(); }
  @Patch("users/:id/access") updateUser(@Param("id") id: string, @Body() body: UpdateUserAccessDto, @Actor() actor: string, @MesRole() role: string) { if (role !== "ADMIN") throw new ForbiddenException("Administrator access is required to update user accounts."); return this.mes.updateUserAccess(id, body, actor); }
  @Get("qualityInspections") inspections(@Query("kind") kind: string, @MesRole() role: string) { requireRole(role, "QC", "MANAGEMENT", "ADMIN"); if (!["IQC", "IPQC", "OQC"].includes(kind)) throw new BadRequestException("Provide kind as IQC, IPQC, or OQC."); return this.mes.listQualityInspections(kind as "IQC" | "IPQC" | "OQC"); }
  @Post("qualityInspections") createInspection(@Body() body: CreateInspectionDto, @Actor() actor: string, @MesRole() role: string) { requireRole(role, "QC", "ADMIN"); return this.mes.createQualityInspection(body, actor); }
  @Patch("qualityInspections/:id/outcome") inspectionOutcome(@Param("id", ParseUUIDPipe) id: string, @Body() body: InspectionOutcomeDto, @Actor() actor: string, @MesRole() role: string) { requireRole(role, "QC", "ADMIN"); return this.mes.recordInspectionOutcome(id, body, actor); }
  @Post("processPlans") createProcessPlan(@Body() body: CreateProcessPlanDto, @Actor() actor: string, @MesRole() role: string) { requireRole(role, "ENG", "ADMIN"); return this.mes.createProcessPlan(body, actor); }
  @Patch("processPlans/:id/status") updateProcessPlan(@Param("id", ParseUUIDPipe) id: string, @Body() body: UpdateProcessPlanStatusDto, @Actor() actor: string, @MesRole() role: string) { requireRole(role, "ENG", "ADMIN"); return this.mes.updateProcessPlanStatus(id, body.status, actor); }
  @Get("my-tasks") tasks(@MesRole() role: string, @Actor() actor: string) { if (!["OPERATOR", "ADMIN"].includes(role)) throw new ForbiddenException("Operator access is required to view production tasks."); return this.mes.listOperatorTasks(actor); }
  @Post("manufacturing-orders/:id/operator-action") operatorAction(@Param("id", ParseUUIDPipe) id: string, @Body() body: OperatorActionDto, @Actor() actor: string, @MesRole() role: string) { if (!["OPERATOR", "ADMIN"].includes(role)) throw new ForbiddenException("Operator access is required to update production tasks."); return this.mes.recordOperatorAction(id, body, actor); }
  @Get("customers") customers() { return this.mes.listCustomers(); }
  @Post("customers") createCustomer(@Body() body: CreateCustomerDto, @Actor() actor: string, @MesRole() role: string) { requireRole(role, "BD", "ADMIN"); return this.mes.createCustomer(body, actor); }
  @Patch("customers/:id") updateCustomer(@Param("id", ParseUUIDPipe) id: string, @Body() body: CreateCustomerDto, @Actor() actor: string, @MesRole() role: string) { requireRole(role, "BD", "ADMIN"); return this.mes.updateCustomer(id, body, actor); }
  @Get("sales-orders") salesOrders() { return this.mes.listSalesOrders(); }
  @Post("sales-orders") createSalesOrder(@Body() body: CreateSalesOrderDto, @Actor() actor: string, @MesRole() role: string) { requireRole(role, "BD", "ADMIN"); return this.mes.createSalesOrder(body, actor); }
  @Patch("sales-orders/:id/status") updateSalesOrder(@Param("id", ParseUUIDPipe) id: string, @Body() body: UpdateSalesOrderStatusDto, @Actor() actor: string, @MesRole() role: string) { requireRole(role, "BD", "ADMIN"); return this.mes.updateSalesOrderStatus(id, body.status, actor); }
  @Post("procurementRequests") createProcurement(@Body() body: CreateProcurementDto, @Actor() actor: string, @MesRole() role: string) { requireRole(role, "SCM", "ADMIN"); return this.mes.createProcurementRequest(body, actor); }
  @Patch("procurementRequests/:id/status") updateProcurement(@Param("id", ParseUUIDPipe) id: string, @Body() body: UpdateProcurementStatusDto, @Actor() actor: string, @MesRole() role: string) { requireRole(role, "SCM", "ADMIN"); return this.mes.updateProcurementStatus(id, body.status, actor); }
  @Get(":resource") list(@Param("resource") resource: string, @Query("limit") limit?: string) {
    if (!(resourceNames as readonly string[]).includes(resource)) throw new BadRequestException(`Unknown MES resource: ${resource}.`);
    const allowedResource = resource as typeof resourceNames[number];
    const parsedLimit = limit === undefined ? 100 : Number(limit);
    return this.mes.list(allowedResource, Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 100);
  }
  @Post("manufacturing-orders") create(@Body() body: CreateWorkOrderDto, @Actor() actor: string, @MesRole() role: string) { requireRole(role, "PRODUCTION_PLANNER", "ENG", "ADMIN"); return this.mes.createWorkOrder(body, actor); }
  @Patch("manufacturing-orders/:id/schedule") schedule(@Param("id", ParseUUIDPipe) id: string, @Body() body: ScheduleWorkOrderDto, @Actor() actor: string, @MesRole() role: string) { requireRole(role, "PRODUCTION_PLANNER", "ADMIN"); return this.mes.scheduleWorkOrder(id, body, actor); }
  @Patch("manufacturing-orders/:id/status") update(@Param("id", ParseUUIDPipe) id: string, @Body() body: UpdateWorkOrderDto, @Actor() actor: string, @MesRole() role: string) { requireRole(role, "PRODUCTION_PLANNER", "ENG", "ADMIN"); return this.mes.updateWorkOrderStatus(id, body.status, actor); }
}
