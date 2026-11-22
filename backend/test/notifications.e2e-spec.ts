import type { INestApplication } from "@nestjs/common";
import request from "supertest";

import {
  addDays,
  formatIsoDate,
  isoWeekday,
} from "../src/availability/timezone";
import { NotificationsService } from "../src/notifications/notifications.service";
import { PrismaService } from "../src/prisma/prisma.service";
import {
  createTestApp,
  DEFAULT_PASSWORD,
  getCookieHeader,
  resetDatabase,
} from "./test-utils";

describe("Notifications (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notifications: NotificationsService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    notifications = app.get(NotificationsService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    await resetDatabase(prisma);
  });

  async function register(email: string, name = "Notification Tester") {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password: DEFAULT_PASSWORD, name });

    return {
      userId: response.body.user.id as string,
      cookie: getCookieHeader(response.headers["set-cookie"]),
    };
  }

  async function createExpert(email: string, name = "Notification Expert") {
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

  async function setupBookingParties() {
    const expert = await createExpert("expert@example.com", "Assigned Expert");
    const candidate = await register("candidate@example.com", "Candidate");
    const date = addDays(formatIsoDate(new Date()), 2);

    await addAvailability(expert.cookie, date);

    return { expert, candidate, date };
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

  async function createApprovedBooking(startsAt = "09:00") {
    const { expert, candidate, date } = await setupBookingParties();

    const created = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      `${date}T${startsAt}:00.000Z`,
    );
    expect(created.status).toBe(201);

    const bookingId = created.body.booking.id as string;
    const approved = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/approve`)
      .set("Cookie", expert.cookie);
    expect(approved.status).toBe(200);

    return { expert, candidate, date, bookingId };
  }

  function listNotifications(cookie: string, query = "") {
    return request(app.getHttpServer())
      .get(`/api/v1/notifications${query}`)
      .set("Cookie", cookie);
  }

  it("publishes one deduplicated expert notification for a booking request", async () => {
    const { expert, candidate, date } = await setupBookingParties();

    const created = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      `${date}T09:00:00.000Z`,
    );
    expect(created.status).toBe(201);

    await notifications.dispatchPendingEvents();
    await notifications.deliverPendingNotifications();

    const expertInbox = await listNotifications(expert.cookie);
    expect(expertInbox.status).toBe(200);
    expect(expertInbox.body.unreadCount).toBe(1);
    expect(expertInbox.body.notifications).toHaveLength(1);
    expect(expertInbox.body.notifications[0]).toMatchObject({
      type: "BOOKING_REQUESTED",
      title: "New booking request",
      isRead: false,
      data: { bookingId: created.body.booking.id },
    });

    const candidateInbox = await listNotifications(candidate.cookie);
    expect(candidateInbox.body.notifications).toHaveLength(0);

    await notifications.dispatchPendingEvents();
    expect(await prisma.notification.count()).toBe(1);
    expect(
      await prisma.notificationEvent.count({
        where: { type: "BOOKING_REQUESTED" },
      }),
    ).toBe(1);

    const delivery = await prisma.notificationDelivery.findFirstOrThrow();
    expect(delivery).toMatchObject({
      channel: "IN_APP",
      status: "SENT",
      attemptCount: 1,
    });
  });

  it("notifies the candidate after approval and decline", async () => {
    const { expert, candidate, date } = await setupBookingParties();

    const first = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      `${date}T09:00:00.000Z`,
    );
    const second = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      `${date}T09:30:00.000Z`,
    );
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${first.body.booking.id}/approve`)
      .set("Cookie", expert.cookie)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${second.body.booking.id}/decline`)
      .set("Cookie", expert.cookie)
      .send({ reason: "The time no longer works for me." })
      .expect(200);

    await notifications.dispatchPendingEvents();
    await notifications.deliverPendingNotifications();

    const inbox = await listNotifications(candidate.cookie);
    expect(inbox.body.unreadCount).toBe(2);

    const approved = inbox.body.notifications.find(
      (item: { type: string }) => item.type === "BOOKING_APPROVED",
    );
    expect(approved).toMatchObject({
      title: "Booking request approved",
      data: { bookingId: first.body.booking.id },
    });

    const declined = inbox.body.notifications.find(
      (item: { type: string }) => item.type === "BOOKING_DECLINED",
    );
    expect(declined).toMatchObject({
      title: "Booking request declined",
      data: {
        bookingId: second.body.booking.id,
        reason: "The time no longer works for me.",
      },
    });
    expect(declined.body).toContain("The time no longer works for me.");
  });

  it("notifies both parties when a payment confirms or a booking expires", async () => {
    const { expert, candidate, date, bookingId } =
      await createApprovedBooking();

    const attempt = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/payment-attempts`)
      .set("Cookie", candidate.cookie);
    expect(attempt.status).toBe(201);

    const paid = await request(app.getHttpServer())
      .post(`/api/v1/payments/${attempt.body.payment.id}/mock-result`)
      .set("Cookie", candidate.cookie)
      .send({ outcome: "SUCCESS" });
    expect(paid.status).toBe(200);

    await notifications.dispatchPendingEvents();
    await notifications.deliverPendingNotifications();

    const [candidateInbox, expertInbox] = await Promise.all([
      listNotifications(candidate.cookie),
      listNotifications(expert.cookie),
    ]);

    expect(
      candidateInbox.body.notifications.filter(
        (item: { type: string }) => item.type === "BOOKING_CONFIRMED",
      ),
    ).toHaveLength(1);
    expect(
      expertInbox.body.notifications.filter(
        (item: { type: string }) => item.type === "BOOKING_CONFIRMED",
      ),
    ).toHaveLength(1);

    const expiring = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      `${date}T09:30:00.000Z`,
    );
    expect(expiring.status).toBe(201);

    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${expiring.body.booking.id}/approve`)
      .set("Cookie", expert.cookie)
      .expect(200);

    await prisma.booking.update({
      where: { id: expiring.body.booking.id },
      data: { paymentDeadline: new Date(Date.now() - 60_000) },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/bookings/${expiring.body.booking.id}`)
      .set("Cookie", candidate.cookie)
      .expect(200);

    await notifications.dispatchPendingEvents();
    await notifications.deliverPendingNotifications();

    const [expiredForCandidate, expiredForExpert] = await Promise.all([
      listNotifications(candidate.cookie),
      listNotifications(expert.cookie),
    ]);

    expect(expiredForCandidate.body.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "BOOKING_EXPIRED",
          data: expect.objectContaining({
            bookingId: expiring.body.booking.id,
          }),
        }),
      ]),
    );
    expect(expiredForExpert.body.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "BOOKING_EXPIRED",
          data: expect.objectContaining({
            bookingId: expiring.body.booking.id,
          }),
        }),
      ]),
    );
  });

  it("creates payment and interview reminders once without a browser session", async () => {
    const { expert, candidate, bookingId } = await createApprovedBooking();
    const now = new Date();
    const paymentDeadline = new Date(now.getTime() + 10 * 60_000);

    await prisma.booking.update({
      where: { id: bookingId },
      data: { paymentDeadline },
    });

    expect(await notifications.enqueueDueReminders(now)).toBe(1);
    await notifications.dispatchPendingEvents();
    await notifications.deliverPendingNotifications();

    expect(await notifications.enqueueDueReminders(now)).toBe(0);
    await notifications.dispatchPendingEvents();
    await notifications.deliverPendingNotifications();

    const afterPaymentReminder = await listNotifications(candidate.cookie);
    expect(
      afterPaymentReminder.body.notifications.filter(
        (item: { type: string }) => item.type === "PAYMENT_DEADLINE_REMINDER",
      ),
    ).toHaveLength(1);

    const startsAt = new Date(now.getTime() + 30 * 60_000);
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
        confirmedAt: now,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60_000),
      },
    });

    expect(await notifications.enqueueDueReminders(now)).toBe(1);
    await notifications.dispatchPendingEvents();
    await notifications.deliverPendingNotifications();

    expect(await notifications.enqueueDueReminders(now)).toBe(0);
    await notifications.dispatchPendingEvents();
    await notifications.deliverPendingNotifications();

    const [candidateInbox, expertInbox] = await Promise.all([
      listNotifications(candidate.cookie),
      listNotifications(expert.cookie),
    ]);

    for (const inbox of [candidateInbox, expertInbox]) {
      expect(
        inbox.body.notifications.filter(
          (item: { type: string }) => item.type === "INTERVIEW_REMINDER",
        ),
      ).toHaveLength(1);
    }

    expect(
      await prisma.notificationEvent.count({
        where: { type: "PAYMENT_DEADLINE_REMINDER" },
      }),
    ).toBe(1);
    expect(
      await prisma.notificationEvent.count({
        where: { type: "INTERVIEW_REMINDER" },
      }),
    ).toBe(1);
  });

  it("keeps the booking committed when delivery fails and retries it", async () => {
    const { expert, candidate, date } = await setupBookingParties();
    const deliveryUpdate = jest
      .spyOn(prisma.notificationDelivery, "update")
      .mockRejectedValueOnce(new Error("Simulated delivery outage."));

    let created: request.Response;

    try {
      created = await requestBooking(
        candidate.cookie,
        expert.profile.id,
        `${date}T09:00:00.000Z`,
      );
    } finally {
      deliveryUpdate.mockRestore();
    }

    expect(created.status).toBe(201);
    expect(
      await prisma.booking.findUnique({
        where: { id: created.body.booking.id },
      }),
    ).not.toBeNull();

    const failedDelivery = await prisma.notificationDelivery.findFirstOrThrow();
    expect(failedDelivery).toMatchObject({
      status: "FAILED",
      attemptCount: 1,
    });
    expect(failedDelivery.lastError).toContain("Simulated delivery outage.");

    await prisma.notificationDelivery.update({
      where: { id: failedDelivery.id },
      data: { nextAttemptAt: new Date(Date.now() - 1_000) },
    });

    expect(await notifications.deliverPendingNotifications()).toBe(1);

    const retried = await prisma.notificationDelivery.findUniqueOrThrow({
      where: { id: failedDelivery.id },
    });
    expect(retried).toMatchObject({
      status: "SENT",
      attemptCount: 2,
      lastError: null,
    });
    expect(retried.sentAt).not.toBeNull();
  });

  it("scopes inbox actions to the recipient and tracks unread state", async () => {
    const { expert, candidate, date } = await setupBookingParties();

    for (const time of ["09:00", "09:30"]) {
      const created = await requestBooking(
        candidate.cookie,
        expert.profile.id,
        `${date}T${time}:00.000Z`,
      );
      expect(created.status).toBe(201);
    }

    await notifications.dispatchPendingEvents();
    await notifications.deliverPendingNotifications();

    const expertInbox = await listNotifications(expert.cookie);
    expect(expertInbox.body.notifications).toHaveLength(2);
    expect(expertInbox.body.unreadCount).toBe(2);
    const notificationId = expertInbox.body.notifications[0].id as string;

    const candidateInbox = await listNotifications(candidate.cookie);
    expect(candidateInbox.body.notifications).toHaveLength(0);

    const candidateRead = await request(app.getHttpServer())
      .post(`/api/v1/notifications/${notificationId}/read`)
      .set("Cookie", candidate.cookie);
    expect(candidateRead.status).toBe(404);
    expect(candidateRead.body.error.code).toBe("NOTIFICATION_NOT_FOUND");

    const anonymous = await request(app.getHttpServer()).get(
      "/api/v1/notifications",
    );
    expect(anonymous.status).toBe(401);

    const read = await request(app.getHttpServer())
      .post(`/api/v1/notifications/${notificationId}/read`)
      .set("Cookie", expert.cookie);
    expect(read.status).toBe(200);
    expect(read.body.notification).toMatchObject({
      id: notificationId,
      isRead: true,
    });
    expect(read.body.notification.readAt).not.toBeNull();

    const unreadOnly = await listNotifications(
      expert.cookie,
      "?unreadOnly=true",
    );
    expect(unreadOnly.body.notifications).toHaveLength(1);
    expect(unreadOnly.body.unreadCount).toBe(1);

    const readAll = await request(app.getHttpServer())
      .post("/api/v1/notifications/read-all")
      .set("Cookie", expert.cookie);
    expect(readAll.status).toBe(200);
    expect(readAll.body.updated).toBe(1);

    const settled = await listNotifications(expert.cookie);
    expect(settled.body.unreadCount).toBe(0);
    expect(
      settled.body.notifications.every(
        (item: { isRead: boolean }) => item.isRead,
      ),
    ).toBe(true);
  });
});
