import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { sql } from "@famax/db";

@Controller("health")
export class HealthController {
  @Get("live") live() { return { status: "ok", service: "famax-mes-api", time: new Date().toISOString() }; }
  @Get("ready") async ready() {
    try { await sql`select 1`; return { status: "ready", database: "connected" }; }
    catch { throw new ServiceUnavailableException({ status: "not_ready", database: "unavailable" }); }
  }
}
