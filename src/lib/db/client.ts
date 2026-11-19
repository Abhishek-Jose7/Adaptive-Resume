import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { createNeonDnsFallbackSocket } from "./neonDnsFallback";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.NEON_DATABASE_URL ||
  "postgresql://postgres@localhost:5432/resume_maker";

// Global client caching to prevent connection exhaustion in serverless environments
declare global {
  // eslint-disable-next-line no-var
  var __dbClient: postgres.Sql | undefined;
}

function createClient() {
  const isServerless = process.env.VERCEL === "1";
  const dnsFallbackEnabled = process.env.DATABASE_DNS_FALLBACK === "doh";
  return postgres(connectionString, {
    max: isServerless ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // Recommended for Neon connection pooling (PgBouncer mode)
    ssl: connectionString.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
    ...(dnsFallbackEnabled ? { socket: createNeonDnsFallbackSocket } : {}),
  });
}

const client = global.__dbClient || createClient();

if (process.env.NODE_ENV !== "production") {
  global.__dbClient = client;
}

export const db = drizzle(client, { schema });

export { client };
export type Database = typeof db;
