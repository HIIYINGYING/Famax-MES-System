import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index";

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString ?? "postgres://postgres:postgres@127.0.0.1:5432/famax_mes", { max: Number(process.env.DB_POOL_SIZE ?? 10), idle_timeout: 20, connect_timeout: 10, prepare: false });
export const db = drizzle(client, { schema });
export { client as sql };
export * from "./schema/index";
export async function closeDatabase() { await client.end({ timeout: 5 }); }
