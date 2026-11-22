/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testEnvironment: "node",
  testRegex: "test/.*\\.e2e-spec\\.ts$",
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  setupFiles: ["<rootDir>/test/setup-env.ts"],
  globalSetup: "<rootDir>/test/global-setup.cjs",
  globalTeardown: "<rootDir>/test/global-teardown.cjs",
  testTimeout: 30_000,
};
