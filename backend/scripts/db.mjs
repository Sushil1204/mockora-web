import "dotenv/config";

import fs from "node:fs";
import path from "node:path";

import EmbeddedPostgres from "embedded-postgres";

const port = Number(process.env.EMBEDDED_PG_PORT ?? 55432);
const database = process.env.EMBEDDED_PG_DATABASE ?? "mockoraa";
const dataDir = path.resolve(process.env.EMBEDDED_PG_DATA_DIR ?? ".pgdata");

const postgres = new EmbeddedPostgres({
  databaseDir: dataDir,
  port,
  user: "postgres",
  password: "postgres",
  persistent: true,
  onLog: (message) => {
    if (process.env.EMBEDDED_PG_LOG === "true") {
      console.log(`[postgres] ${message}`);
    }
  },
});

async function main() {
  if (!fs.existsSync(path.join(dataDir, "PG_VERSION"))) {
    console.log(`Initialising embedded PostgreSQL in ${dataDir}...`);
    await postgres.initialise();
  }

  await postgres.start();

  try {
    await postgres.createDatabase(database);
    console.log(`Created database "${database}".`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.includes("already exists")) {
      throw error;
    }
  }

  console.log(`PostgreSQL ready on port ${port} (database "${database}").`);
  console.log(
    `DATABASE_URL=postgresql://postgres:postgres@localhost:${port}/${database}?schema=public`,
  );
  console.log("Press Ctrl+C to stop the database.");

  const shutdown = async () => {
    console.log("\nStopping PostgreSQL...");
    await postgres.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  setInterval(() => undefined, 60_000);
}

main().catch(async (error) => {
  console.error(error);
  await postgres.stop().catch(() => undefined);
  process.exit(1);
});
