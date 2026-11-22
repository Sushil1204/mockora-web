import { createHash } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";

import { PrismaService } from "../src/prisma/prisma.service";
import {
  createTestApp,
  DEFAULT_PASSWORD,
  getCookieHeader,
  resetDatabase,
} from "./test-utils";

describe("Authentication (e2e)", () => {
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

  function register(
    email = "candidate@example.com",
    password = DEFAULT_PASSWORD,
    extra: Record<string, unknown> = {},
  ) {
    return request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password, name: "Test Candidate", ...extra });
  }

  it("registers a candidate and issues an httpOnly session cookie", async () => {
    const response = await register("Mixed.Case@Example.com");

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      email: "mixed.case@example.com",
      name: "Test Candidate",
      roles: ["CANDIDATE"],
      accountStatus: "ACTIVE",
    });
    expect(response.body.user.passwordHash).toBeUndefined();

    const cookie = getCookieHeader(response.headers["set-cookie"]);
    expect(cookie.startsWith("mockoraa_session=")).toBe(true);
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"][0]).toContain("SameSite=Lax");
  });

  it("ignores client-supplied roles during registration", async () => {
    const response = await register("sneaky@example.com", DEFAULT_PASSWORD, {
      roles: ["ADMIN"],
      role: "ADMIN",
    });

    expect(response.status).toBe(201);
    expect(response.body.user.roles).toEqual(["CANDIDATE"]);
  });

  it("rejects duplicate email addresses", async () => {
    await register("duplicate@example.com");
    const response = await register("duplicate@example.com");

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("validates registration input server-side", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "not-an-email", password: "short", name: "A" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details.fields.length).toBeGreaterThan(0);
  });

  it("logs in with valid credentials and rejects invalid ones", async () => {
    await register("login@example.com");

    const wrong = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "login@example.com", password: "wrong-password" });

    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS");

    const success = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "LOGIN@example.com", password: DEFAULT_PASSWORD });

    expect(success.status).toBe(200);
    expect(success.body.user.email).toBe("login@example.com");
  });

  it("rejects unauthenticated access to private endpoints", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns the current user for a valid cookie session", async () => {
    const registered = await register();
    const cookie = getCookieHeader(registered.headers["set-cookie"]);

    const me = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Cookie", cookie);

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("candidate@example.com");
  });

  it("revokes the session on logout", async () => {
    const registered = await register();
    const cookie = getCookieHeader(registered.headers["set-cookie"]);

    const logout = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie);

    expect(logout.status).toBe(204);

    const me = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Cookie", cookie);

    expect(me.status).toBe(401);
  });

  it("rotates the session on refresh and invalidates the old token", async () => {
    const registered = await register();
    const oldCookie = getCookieHeader(registered.headers["set-cookie"]);

    const refreshed = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", oldCookie);

    expect(refreshed.status).toBe(200);
    const newCookie = getCookieHeader(refreshed.headers["set-cookie"]);
    expect(newCookie).not.toBe(oldCookie);

    const oldSession = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Cookie", oldCookie);
    expect(oldSession.status).toBe(401);

    const newSession = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Cookie", newCookie);
    expect(newSession.status).toBe(200);
  });

  it("updates only the current user's basic profile", async () => {
    const registered = await register();
    const cookie = getCookieHeader(registered.headers["set-cookie"]);

    const updated = await request(app.getHttpServer())
      .patch("/api/v1/me")
      .set("Cookie", cookie)
      .send({
        name: "Updated Name",
        countryCode: "in",
        preferredLanguage: "en-IN",
        roles: ["ADMIN"],
      });

    expect(updated.status).toBe(200);
    expect(updated.body.user).toMatchObject({
      name: "Updated Name",
      countryCode: "IN",
      preferredLanguage: "en-IN",
      roles: ["CANDIDATE"],
    });

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: "candidate@example.com" },
    });
    expect(stored.name).toBe("Updated Name");
  });

  it("cannot update another user's profile through the current-user endpoint", async () => {
    const first = await register("first@example.com");
    const second = await register("second@example.com");
    const firstCookie = getCookieHeader(first.headers["set-cookie"]);

    const updated = await request(app.getHttpServer())
      .patch("/api/v1/me")
      .set("Cookie", firstCookie)
      .send({ name: "First Updated", id: second.body.user.id });

    expect(updated.status).toBe(200);
    expect(updated.body.user.id).toBe(first.body.user.id);
    expect(updated.body.user.name).toBe("First Updated");

    const secondUser = await prisma.user.findUniqueOrThrow({
      where: { email: "second@example.com" },
    });
    expect(secondUser.name).toBe("Test Candidate");
  });

  it("resets a password with a valid single-use token", async () => {
    const registered = await register("reset@example.com");
    const oldCookie = getCookieHeader(registered.headers["set-cookie"]);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "reset@example.com" },
    });

    const rawToken = "test-reset-token-value-that-is-long-enough";
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(rawToken).digest("hex"),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const reset = await request(app.getHttpServer())
      .post("/api/v1/auth/reset-password")
      .send({ token: rawToken, password: "a-new-secure-password" });
    expect(reset.status).toBe(204);

    const oldSession = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Cookie", oldCookie);
    expect(oldSession.status).toBe(401);

    const oldPassword = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "reset@example.com", password: DEFAULT_PASSWORD });
    expect(oldPassword.status).toBe(401);

    const newPassword = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "reset@example.com", password: "a-new-secure-password" });
    expect(newPassword.status).toBe(200);

    const reuse = await request(app.getHttpServer())
      .post("/api/v1/auth/reset-password")
      .send({ token: rawToken, password: "another-secure-password" });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error.code).toBe("INVALID_RESET_TOKEN");
  });

  it("returns a generic response for password recovery without leaking accounts", async () => {
    const missing = await request(app.getHttpServer())
      .post("/api/v1/auth/forgot-password")
      .send({ email: "nobody@example.com" });

    expect(missing.status).toBe(204);
    expect(await prisma.passwordResetToken.count()).toBe(0);
  });

  it("rejects a session for a suspended account", async () => {
    const registered = await register("suspended@example.com");
    const cookie = getCookieHeader(registered.headers["set-cookie"]);

    await prisma.user.update({
      where: { email: "suspended@example.com" },
      data: { accountStatus: "SUSPENDED" },
    });

    const me = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Cookie", cookie);

    expect(me.status).toBe(401);
  });
});
