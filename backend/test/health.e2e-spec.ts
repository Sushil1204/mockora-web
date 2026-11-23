import type { INestApplication } from "@nestjs/common";
import request from "supertest";

import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp } from "./test-utils";

describe("Health and request context (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns liveness and a request ID", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("preserves a valid caller request ID and replaces an invalid one", async () => {
    const preserved = await request(app.getHttpServer())
      .get("/api/v1/health")
      .set("X-Request-ID", "checkout-request-123");

    expect(preserved.headers["x-request-id"]).toBe("checkout-request-123");

    const replaced = await request(app.getHttpServer())
      .get("/api/v1/health")
      .set("X-Request-ID", "short");

    expect(replaced.headers["x-request-id"]).not.toBe("short");
    expect(replaced.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("reports database readiness and fails closed", async () => {
    const ready = await request(app.getHttpServer()).get(
      "/api/v1/health/ready",
    );

    expect(ready.status).toBe(200);
    expect(ready.body).toEqual({
      status: "ok",
      checks: { database: "up" },
    });

    const query = jest
      .spyOn(prisma, "$queryRaw")
      .mockRejectedValueOnce(new Error("database unavailable"));

    const unavailable = await request(app.getHttpServer()).get(
      "/api/v1/health/ready",
    );

    expect(unavailable.status).toBe(503);
    expect(unavailable.body).toEqual({
      status: "unavailable",
      checks: { database: "down" },
    });

    query.mockRestore();
  });
});
