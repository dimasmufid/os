import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "./schema.js";

export type Database = PostgresJsDatabase<typeof schema>;

type CreateDbOptions = {
  /**
   * Override the default Postgres connection string.
   */
  url?: string;
  /**
   * Maximum number of pooled connections. Defaults to 1 for serverless safety.
   */
  maxConnections?: number;
};

let cachedDb: Database | null = null;
let cachedClient: Sql | null = null;

const getDatabaseUrl = (explicitUrl?: string) => {
  const databaseUrl = explicitUrl ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and update the connection string.",
    );
  }

  return databaseUrl;
};

export const createDb = (options: CreateDbOptions = {}): Database => {
  const databaseUrl = getDatabaseUrl(options.url);
  const sql = postgres(databaseUrl, {
    max: options.maxConnections ?? 1,
    prepare: false,
  });

  cachedClient = sql;
  cachedDb = drizzle(sql, { schema });

  return cachedDb;
};

export const getDb = () => cachedDb ?? createDb();

export const getSqlClient = () => {
  if (!cachedClient) {
    getDb();
  }

  return cachedClient as Sql;
};

export const closeDb = async () => {
  if (cachedClient) {
    await cachedClient.end({ timeout: 5 });
    cachedClient = null;
    cachedDb = null;
  }
};

export * as dbSchema from "./schema.js";
