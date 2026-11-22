import { createHmac } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";

import {
  addDays,
  formatIsoDate,
  isoWeekday,
} from "../src/availability/timezone";
import { InterviewSessionsService } from "../src/interviews/interview-sessions.service";
import { PrismaService } from "../src/prisma/prisma.service";
import {
  createTestApp,
  DEFAULT_PASSWORD,
  getCookieHeader,
  resetDatabase,
} from "./test-utils";

describe("Interview sessions (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let interviews: InterviewSessionsService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    interviews = app.get(InterviewSessionsService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function register(email: string, name: string) {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password: DEFAULT_PASSWORD, name });

    return {
      userId: response.body.user.id as string,
      cookie: getCookieHeader(response.headers["set-cookie"]),
    };
  }

  async function createExpert(email: string, name: string) {
    const account = await register(email, name);

    await prisma.userRole.create({
      data: { userId: account.userId, role: "EXPERT", status: "ACTIVE" },
    });

    const profile = await prisma.expertProfile.create({
      data: {
        userId: account.userId,
        professionalHeadline: "Interview coach",
        currentDesignation: "Staff Engineer",
        currentCompany: "Acme",
        countryCode: "IN",
        timezone: "UTC",
        introduction: "Experienced interviewer and coach.",
        yearsExperience: 8,
        verificationStatus: "APPROVED",
        publicationStatus: "PUBLISHED",
      },
    });

    return { ...account, profile };
  }

  async function addAvailability(expertCookie: string, date: string) {
    const response = await request(app.getHttpServer())
      .put("/api/v1/expert/availability/rules")
      .set("Cookie", expertCookie)
      .send({
        rules: [
          {
            weekday: isoWeekday(date),
            startLocalTime: "09:00",
            endLocalTime: "12:00",
            timezone: "UTC",
            slotDurationMinutes: 30,
            effectiveFrom: date,
            effectiveUntil: null,
            isActive: true,
          },
        ],
      });

    expect(response.status).toBe(200);
  }

  async function requestBooking(
    candidateCookie: string,
    expertProfileId: string,
    startsAt: string,
  ) {
    return request(app.getHttpServer())
      .post("/api/v1/bookings")
      .set("Cookie", candidateCookie)
      .send({ expertProfileId, startsAt });
  }

  async function createConfirmedBooking() {
    const expert = await createExpert("expert@example.com", "Assigned Expert");
    const candidate = await register("candidate@example.com", "Candidate");
    const date = addDays(formatIsoDate(new Date()), 2);
    const startsAt = `${date}T09:00:00.000Z`;

    await addAvailability(expert.cookie, date);

    const created = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      startsAt,
    );
    expect(created.status).toBe(201);
    const bookingId = created.body.booking.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/approve`)
      .set("Cookie", expert.cookie)
      .expect(200);

    const attempt = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/payment-attempts`)
      .set("Cookie", candidate.cookie);
    expect(attempt.status).toBe(201);

    await request(app.getHttpServer())
      .post(`/api/v1/payments/${attempt.body.payment.id}/mock-result`)
      .set("Cookie", candidate.cookie)
      .send({ outcome: "SUCCESS" })
      .expect(200);

    return { expert, candidate, bookingId, date };
  }

  function getSession(cookie: string, bookingId: string) {
    return request(app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}/interview-session`)
      .set("Cookie", cookie);
  }

  function getToken(cookie: string, bookingId: string) {
    return request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/interview-session/token`)
      .set("Cookie", cookie);
  }

  async function moveIntoJoinWindow(bookingId: string) {
    const now = new Date();
    const startsAt = new Date(now.getTime() - 5 * 60_000);
    const endsAt = new Date(now.getTime() + 25 * 60_000);

    await prisma.booking.update({
      where: { id: bookingId },
      data: { startsAt, endsAt },
    });

    return { startsAt, endsAt };
  }

  it("exposes state only to assigned participants and rejects unconfirmed bookings", async () => {
    const { expert, candidate, bookingId, date } =
      await createConfirmedBooking();
    const stranger = await register("stranger@example.com", "Stranger");

    const candidateState = await getSession(candidate.cookie, bookingId);
    expect(candidateState.status).toBe(200);
    expect(candidateState.body.interview).toMatchObject({
      provider: "STREAM_VIDEO",
      configured: true,
      status: "NOT_STARTED",
      unavailableReason: "NOT_OPEN",
      canJoin: false,
      booking: { id: bookingId, status: "CONFIRMED" },
    });

    const expertState = await getSession(expert.cookie, bookingId);
    expect(expertState.status).toBe(200);

    const hidden = await getSession(stranger.cookie, bookingId);
    expect(hidden.status).toBe(404);
    expect(hidden.body.error.code).toBe("BOOKING_NOT_FOUND");

    const anonymous = await request(app.getHttpServer()).get(
      `/api/v1/bookings/${bookingId}/interview-session`,
    );
    expect(anonymous.status).toBe(401);

    const pending = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      `${date}T09:30:00.000Z`,
    );
    expect(pending.status).toBe(201);

    const pendingState = await getSession(
      candidate.cookie,
      pending.body.booking.id,
    );
    expect(pendingState.body.interview).toMatchObject({
      unavailableReason: "NOT_CONFIRMED",
      canJoin: false,
    });

    const pendingToken = await getToken(
      candidate.cookie,
      pending.body.booking.id,
    );
    expect(pendingToken.status).toBe(409);
    expect(pendingToken.body.error.code).toBe("BOOKING_NOT_CONFIRMED");
  });

  it("validates the join window and issues signed participant tokens", async () => {
    const { expert, candidate, bookingId } = await createConfirmedBooking();

    const earlyStart = new Date(Date.now() + 30 * 60_000);
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        startsAt: earlyStart,
        endsAt: new Date(earlyStart.getTime() + 30 * 60_000),
      },
    });

    const early = await getToken(candidate.cookie, bookingId);
    expect(early.status).toBe(409);
    expect(early.body.error.code).toBe("INTERVIEW_NOT_OPEN");

    const { startsAt, endsAt } = await moveIntoJoinWindow(bookingId);

    const candidateTokenResponse = await getToken(candidate.cookie, bookingId);
    expect(candidateTokenResponse.status).toBe(200);

    const access = candidateTokenResponse.body.interview;
    expect(access).toMatchObject({
      provider: "STREAM_VIDEO",
      status: "IN_PROGRESS",
      canJoin: true,
      apiKey: "test-stream-api-key",
      callId: access.sessionName,
      callType: "default",
      userName: "Candidate",
      userId: candidate.userId,
      booking: { id: bookingId, status: "IN_PROGRESS" },
    });
    expect(access.token).toEqual(expect.any(String));
    expect(JSON.stringify(access)).not.toContain("test-stream-api-secret");

    const [header, payload, signature] = access.token.split(".");
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Record<string, unknown>;

    expect(claims).toMatchObject({
      user_id: candidate.userId,
    });
    expect(Number(claims.exp) - Number(claims.iat)).toBeGreaterThanOrEqual(
      1800,
    );

    const expectedSignature = createHmac("sha256", "test-stream-api-secret")
      .update(`${header}.${payload}`)
      .digest("base64url");
    expect(signature).toBe(expectedSignature);

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { interviewSession: true, history: true },
    });
    expect(booking.status).toBe("IN_PROGRESS");
    expect(booking.interviewSession).toMatchObject({
      status: "IN_PROGRESS",
      providerSessionReference: access.sessionName,
    });
    expect(booking.interviewSession?.startedAt).not.toBeNull();
    expect(
      booking.history.filter((entry) => entry.toStatus === "IN_PROGRESS"),
    ).toHaveLength(1);

    const expertTokenResponse = await getToken(expert.cookie, bookingId);
    expect(expertTokenResponse.status).toBe(200);
    expect(expertTokenResponse.body.interview.sessionName).toBe(
      access.sessionName,
    );
    expect(expertTokenResponse.body.interview.userName).toBe("Assigned Expert");
    expect(expertTokenResponse.body.interview.callId).toBe(access.callId);
    expect(expertTokenResponse.body.interview.token).not.toBe(access.token);

    const repeated = await getToken(candidate.cookie, bookingId);
    expect(repeated.status).toBe(200);
    expect(repeated.body.interview.startedAt).toBe(access.startedAt);

    expect(await prisma.interviewSession.count()).toBe(1);
    expect(
      await prisma.bookingStatusHistory.count({
        where: { bookingId, toStatus: "IN_PROGRESS" },
      }),
    ).toBe(1);

    const state = await getSession(candidate.cookie, bookingId);
    expect(state.body.interview).toMatchObject({
      status: "IN_PROGRESS",
      canJoin: true,
      unavailableReason: null,
      joinWindow: {
        opensAt: new Date(startsAt.getTime() - 15 * 60_000).toISOString(),
        closesAt: new Date(endsAt.getTime() + 15 * 60_000).toISOString(),
      },
    });
  });

  it("closes an elapsed session and moves the booking to feedback pending", async () => {
    const { candidate, bookingId } = await createConfirmedBooking();
    await moveIntoJoinWindow(bookingId);

    const tokenResponse = await getToken(candidate.cookie, bookingId);
    expect(tokenResponse.status).toBe(200);

    const now = new Date();
    const startsAt = new Date(now.getTime() - 60 * 60_000);
    const endsAt = new Date(now.getTime() - 30 * 60_000);

    await prisma.booking.update({
      where: { id: bookingId },
      data: { startsAt, endsAt },
    });

    expect(await interviews.closeElapsedSessions(now)).toBe(1);

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { interviewSession: true, history: true },
    });
    expect(booking.status).toBe("COMPLETED_PENDING_FEEDBACK");
    expect(booking.interviewSession).toMatchObject({
      status: "ENDED",
      endedAt: endsAt,
    });
    expect(booking.history.at(-1)).toMatchObject({
      fromStatus: "IN_PROGRESS",
      toStatus: "COMPLETED_PENDING_FEEDBACK",
    });

    const late = await getToken(candidate.cookie, bookingId);
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe("INTERVIEW_ENDED");

    const state = await getSession(candidate.cookie, bookingId);
    expect(state.body.interview).toMatchObject({
      status: "ENDED",
      canJoin: false,
      unavailableReason: "ENDED",
    });

    expect(await interviews.closeElapsedSessions(now)).toBe(0);
  });

  it("rejects token requests after the join window and for unknown bookings", async () => {
    const { candidate, bookingId } = await createConfirmedBooking();
    const now = new Date();

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        startsAt: new Date(now.getTime() - 60 * 60_000),
        endsAt: new Date(now.getTime() - 30 * 60_000),
      },
    });

    const closed = await getToken(candidate.cookie, bookingId);
    expect(closed.status).toBe(409);
    expect(closed.body.error.code).toBe("INTERVIEW_WINDOW_CLOSED");
    expect(closed.body.error.details.closesAt).toEqual(expect.any(String));

    const unknown = await getToken(
      candidate.cookie,
      "9f2a9d10-6f20-4d43-9f5f-1f66b30e5a17",
    );
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe("BOOKING_NOT_FOUND");
  });
});
