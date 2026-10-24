import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { assertDisposablePostgresConnection } from "./disposablePostgres.js";

const databaseUrlSchema = z.string().url();
const testDatabaseUrl = databaseUrlSchema.safeParse(process.env.JARVIS_AGENT_SYNC_TEST_DATABASE_URL);

if (!testDatabaseUrl.success || process.env.DATABASE_URL !== testDatabaseUrl.data) {
  console.error("Disposable PostgreSQL identity check failed; no database URL was emitted.");
  process.exitCode = 1;
} else {
  const prisma = new PrismaClient();
  try {
    await assertDisposablePostgresConnection(testDatabaseUrl.data, () => prisma.$queryRaw`
      SELECT current_database() AS "database",
        current_user AS "role",
        inet_server_addr()::text AS "serverAddress",
        inet_server_port() AS "serverPort"
    `);
    console.log("Disposable PostgreSQL identity verified.");
  } catch {
    console.error("Disposable PostgreSQL identity check failed; no connection details were emitted.");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
