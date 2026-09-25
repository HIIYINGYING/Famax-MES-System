import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";
import type { FastifyRequest } from "fastify";
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { MesService, type ResourceName } from "./mes.service";
import { SessionGuard } from "./session.guard";

const Actor = createParamDecorator((_data: unknown, context: ExecutionContext) => ((context.switchToHttp().getRequest<FastifyRequest & { user?: { id: string } }>()).user?.id ?? "unknown"));
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
const resourceNames = ["manufacturingOrders", "inventoryItems", "procurementRequests", "qualityInspections", "machines"] as const;

@Controller()
@UseGuards(SessionGuard)
export class MesController {
  constructor(private readonly mes: MesService) {}
  @Get("dashboard") dashboard() { return this.mes.dashboard(); }
  @Get("customers") customers() { return this.mes.listCustomers(); }
  @Post("customers") createCustomer(@Body() body: CreateCustomerDto, @Actor() actor: string) { return this.mes.createCustomer(body, actor); }
  @Get("sales-orders") salesOrders() { return this.mes.listSalesOrders(); }
  @Post("sales-orders") createSalesOrder(@Body() body: CreateSalesOrderDto, @Actor() actor: string) { return this.mes.createSalesOrder(body, actor); }
  @Get(":resource") list(@Param("resource") resource: string, @Query("limit") limit?: string) {
    if (!resourceNames.includes(resource as ResourceName)) throw new BadRequestException(`Unknown MES resource: ${resource}.`);
    const parsedLimit = limit === undefined ? 100 : Number(limit);
    return this.mes.list(resource as ResourceName, Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 100);
  }
  @Post("manufacturing-orders") create(@Body() body: CreateWorkOrderDto, @Actor() actor: string) { return this.mes.createWorkOrder(body, actor); }
  @Patch("manufacturing-orders/:id/status") update(@Param("id", ParseUUIDPipe) id: string, @Body() body: UpdateWorkOrderDto, @Actor() actor: string) { return this.mes.updateWorkOrderStatus(id, body.status, actor); }
}
