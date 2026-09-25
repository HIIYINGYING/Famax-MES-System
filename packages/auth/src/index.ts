import { betterAuth } from "better-auth";
import { admin, organization } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@famax/db";
import * as schema from "@famax/db/schema";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const secret = process.env.BETTER_AUTH_SECRET ?? "local-development-secret-change-before-deploy-000000000000";

export const auth = betterAuth({
  appName: "FAMAX MES",
  baseURL,
  secret,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, requireEmailVerification: process.env.NODE_ENV === "production" },
  user: { additionalFields: { mesRole: { type: "string", required: false, defaultValue: "OPERATOR", input: false } } },
  plugins: [admin(), organization({ allowUserToCreateOrganization: false, creatorRole: "owner", membershipLimit: 250 })],
  trustedOrigins: [baseURL, ...(process.env.AUTH_TRUSTED_ORIGINS?.split(",").map(value => value.trim()).filter(Boolean) ?? [])],
});

export function assertAuthConfig() {
  if (process.env.NODE_ENV === "production" && (!process.env.BETTER_AUTH_SECRET || !process.env.DATABASE_URL || !process.env.BETTER_AUTH_URL)) {
    throw new Error("BETTER_AUTH_SECRET, BETTER_AUTH_URL, and DATABASE_URL must be configured before enabling production authentication.");
  }
}

export type AuthSession = typeof auth.$Infer.Session;
