const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.resolve(".pgdata-test");

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
    return null;
  }

  return path.join(
    path.dirname(require.resolve(`@embedded-postgres/${packageName}`)),
    "..",
    "native",
    "bin",
  );
}

module.exports = async function globalTeardown() {
  if (!fs.existsSync(DATA_DIR)) {
    return;
  }

  const binDirectory = binaryDirectory();

  if (!binDirectory) {
    return;
  }

  const extension = process.platform === "win32" ? ".exe" : "";

  try {
    execFileSync(
      path.join(binDirectory, `pg_ctl${extension}`),
      ["-D", DATA_DIR, "-m", "fast", "-w", "stop"],
      { stdio: "ignore" },
    );
  } catch {
    // The database may already be stopped if startup failed.
  }
};
