import { toNextJsHandler } from "better-auth/next-js";
import { assertAuthConfig, auth } from "@famax/auth";

const handlers = toNextJsHandler(auth);
export async function GET(request: Request) { assertAuthConfig(); return handlers.GET(request); }
export async function POST(request: Request) { assertAuthConfig(); return handlers.POST(request); }
