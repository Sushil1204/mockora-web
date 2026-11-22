import type { INestApplication } from "@nestjs/common";
import request from "supertest";

import { PrismaService } from "../src/prisma/prisma.service";
import {
  createTestApp,
  DEFAULT_PASSWORD,
  getCookieHeader,
  resetDatabase,
} from "./test-utils";

describe("Roles and authorization (e2e)", () => {
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

  async function register(email: string) {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password: DEFAULT_PASSWORD, name: "Role Tester" });

    return {
      response,
      cookie: getCookieHeader(response.headers["set-cookie"]),
      userId: response.body.user.id as string,
    };
  }

  async function makeAdmin(userId: string): Promise<void> {
    await prisma.userRole.create({ data: { userId, role: "ADMIN" } });
  }

  it("rejects unauthenticated and non-admin role assignment", async () => {
    const unauthenticated = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${crypto.randomUUID()}/roles`)
      .send({ role: "EXPERT" });
    expect(unauthenticated.status).toBe(401);

    const candidate = await register("candidate@example.com");
    const forbidden = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${candidate.userId}/roles`)
      .set("Cookie", candidate.cookie)
      .send({ role: "EXPERT" });

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe("FORBIDDEN");
  });

  it("allows an admin to grant a dual EXPERT role", async () => {
    const admin = await register("admin@example.com");
    await makeAdmin(admin.userId);
    const target = await register("target@example.com");

    const granted = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${target.userId}/roles`)
      .set("Cookie", admin.cookie)
      .send({ role: "EXPERT" });

    expect(granted.status).toBe(200);
    expect(granted.body.user.roles).toEqual(["CANDIDATE", "EXPERT"]);

    const me = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Cookie", target.cookie);

    expect(me.status).toBe(200);
    expect(me.body.user.roles).toEqual(["CANDIDATE", "EXPERT"]);
  });

  it("prevents an admin from granting themselves admin access", async () => {
    const admin = await register("self@example.com");
    await makeAdmin(admin.userId);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${admin.userId}/roles`)
      .set("Cookie", admin.cookie)
      .send({ role: "ADMIN" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("SELF_ROLE_ASSIGNMENT");
  });

  it("never exposes suspended roles as active", async () => {
    const admin = await register("admin2@example.com");
    await makeAdmin(admin.userId);
    const target = await register("target2@example.com");

    await prisma.userRole.create({
      data: {
        userId: target.userId,
        role: "EXPERT",
        status: "SUSPENDED",
      },
    });

    const me = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Cookie", target.cookie);

    expect(me.status).toBe(200);
    expect(me.body.user.roles).toEqual(["CANDIDATE"]);
  });

  it("validates role names and target users", async () => {
    const admin = await register("admin3@example.com");
    await makeAdmin(admin.userId);

    const invalidRole = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${crypto.randomUUID()}/roles`)
      .set("Cookie", admin.cookie)
      .send({ role: "SUPERUSER" });

    expect(invalidRole.status).toBe(400);
    expect(invalidRole.body.error.code).toBe("VALIDATION_ERROR");

    const missingUser = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${crypto.randomUUID()}/roles`)
      .set("Cookie", admin.cookie)
      .send({ role: "EXPERT" });

    expect(missingUser.status).toBe(404);
    expect(missingUser.body.error.code).toBe("USER_NOT_FOUND");
  });
});
