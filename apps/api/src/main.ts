import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { AppModule } from "./app.module";
import { createLogger } from "@famax/observability";
import { createMesMcpServer } from "./mcp/server";
import { assertAuthConfig, auth } from "@famax/auth";
import { sql } from "@famax/db";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

async function bootstrap() {
  if (process.env.NODE_ENV === "production") assertAuthConfig();
  const logger = createLogger("api");
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: false, bodyLimit: 1_048_576 }));
  app.setGlobalPrefix("api/v1", { exclude: ["health/live", "health/ready"] });
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  await app.register(cors, { origin: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(",").map(value => value.trim()), credentials: true });
  const fastify = app.getHttpAdapter().getInstance();
  fastify.post("/api/v1/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) if (typeof value === "string") headers.set(key, value);
    const session = await auth.api.getSession({ headers });
    if (!session) return reply.code(401).send({ error: "A valid MES session is required." });
    const mcp = createMesMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await mcp.connect(transport);
    reply.hijack();
    await transport.handleRequest(request.raw, reply.raw, request.body);
    await transport.close();
    await mcp.close();
  });
  fastify.get("/api/v1/mcp", async (_request, reply) => reply.code(405).header("allow", "POST").send({ error: "Use MCP Streamable HTTP POST." }));
  fastify.delete("/api/v1/mcp", async (_request, reply) => reply.code(405).send({ error: "Stateless MCP sessions are not supported." }));
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  await logger.info("FAMAX MES API listening", { port, prefix: "/api/v1" });
}

bootstrap().catch(error => { console.error("API startup failed", error); process.exitCode = 1; });
