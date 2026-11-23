import type { INestApplication } from "@nestjs/common";
import request from "supertest";

import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp, DEFAULT_PASSWORD, resetDatabase } from "./test-utils";

describe("Authentication rate limiting (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it("limits repeated login attempts and returns a retry delay", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email: "rate-limit@example.com",
        password: DEFAULT_PASSWORD,
        name: "Rate Limited",
      })
      .expect(201);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: "rate-limit@example.com",
          password: "wrong-password",
        });

      expect(response.status).toBe(401);
    }

    const limited = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "rate-limit@example.com",
        password: DEFAULT_PASSWORD,
      });

    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(limited.body.error.details.retryAfterSeconds).toEqual(
      expect.any(Number),
    );
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
  });
});
