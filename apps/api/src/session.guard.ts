import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { auth } from "@famax/auth";
import type { FastifyRequest } from "fastify";

@Injectable()
export class SessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) if (typeof value === "string") headers.set(key, value);
    const session = await auth.api.getSession({ headers });
    if (!session) throw new UnauthorizedException("A valid MES session is required.");
    (request as FastifyRequest & { user?: typeof session.user }).user = session.user;
    return true;
  }
}
