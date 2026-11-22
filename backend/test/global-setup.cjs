const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const PORT = 55433;
const DATABASE = "mockoraa_test";
const DATA_DIR = path.resolve(".pgdata-test");
const LOG_FILE = path.resolve(".pgdata-test.log");
const DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${PORT}/${DATABASE}?schema=public`;

function binaryDirectory() {
  const platformPackages = {
    linux: {
      x64: "linux-x64",
      arm64: "linux-arm64",
      arm: "linux-arm",
      ia32: "linux-ia32",
      ppc64: "linux-ppc64",
    },
    darwin: { x64: "darwin-x64", arm64: "darwin-arm64" },
    win32: { x64: "windows-x64" },
  };

  const packageName =
    platformPackages[process.platform]?.[process.arch] ?? null;

  if (!packageName) {
    throw new Error(
      `Unsupported platform for embedded PostgreSQL: ${process.platform}/${process.arch}`,
    );
  }

  return path.join(
    path.dirname(require.resolve(`@embedded-postgres/${packageName}`)),
    "..",
    "native",
    "bin",
  );
}

module.exports = async function globalSetup() {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const { Client } = require("pg");

  fs.rmSync(DATA_DIR, { recursive: true, force: true });

  const postgres = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    port: PORT,
    user: "postgres",
    password: "postgres",
    persistent: true,
    onLog: () => undefined,
  });

  await postgres.initialise();

  const binDirectory = binaryDirectory();
  const extension = process.platform === "win32" ? ".exe" : "";

  execFileSync(
    path.join(binDirectory, `pg_ctl${extension}`),
    [
      "-D",
      DATA_DIR,
      "-l",
      LOG_FILE,
      "-o",
      `-p ${PORT} -h 127.0.0.1`,
      "-w",
      "start",
    ],
    { stdio: "inherit" },
  );

  const client = new Client({
    connectionString: `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres`,
  });

  await client.connect();

  try {
    await client.query(`CREATE DATABASE "${DATABASE}"`);
  } catch (error) {
    if (error.code !== "42P04") {
      throw error;
    }
  } finally {
    await client.end();
  }

  execFileSync(
    path.join(process.cwd(), "node_modules", ".bin", "prisma"),
    ["migrate", "deploy"],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL },
      stdio: "inherit",
    },
  );
};
