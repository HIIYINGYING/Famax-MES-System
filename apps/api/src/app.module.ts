import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { MesController } from "./mes.controller";
import { MesService } from "./mes.service";
import { SessionGuard } from "./session.guard";

@Module({ controllers: [HealthController, MesController], providers: [MesService, SessionGuard] })
export class AppModule {}
