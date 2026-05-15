import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../../apps/api/src/prisma/prisma.service";
import { authHeader, loginAsDemoAdmin } from "./helpers/auth.helper";
import { cleanupDailyLogGraph } from "./helpers/cleanup.helper";
import { createSmokeTestApp } from "./helpers/app.helper";
import {
  createDailyLog,
  createDailyLogEvent,
  uploadPdfAttachment,
} from "./helpers/daily-log.helper";
import {
  getDemoProjectId,
  getSmokeEventTypeId,
  uniqueFutureDate,
} from "./helpers/data.helper";

describe("DailyLog workflow smoke", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let projectId: string;
  let eventTypeId: string;
  const createdDailyLogIds: string[] = [];
  const runId = `smoke-${Date.now()}`;

  beforeAll(async () => {
    const testApp = await createSmokeTestApp();
    app = testApp.app;
    prisma = testApp.prisma;

    const auth = await loginAsDemoAdmin(app);
    token = auth.token;
    projectId = await getDemoProjectId(prisma);
    eventTypeId = await getSmokeEventTypeId(prisma);
  });

  afterAll(async () => {
    await cleanupDailyLogGraph(prisma, createdDailyLogIds);
    await app.close();
  });

  async function createTrackedDailyLog(name: string) {
    const dailyLog = await createDailyLog(app, token, {
      projectId,
      logDate: uniqueFutureDate(`${runId}-${name}`),
      comments: `Smoke ${name}`,
    });

    createdDailyLogIds.push(dailyLog.id);

    return dailyLog;
  }

  it("health endpoint works", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/health")
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          status: "ok",
          service: "bitacora-api",
        });
      });
  });

  it("login works", async () => {
    const auth = await loginAsDemoAdmin(app);

    expect(auth.token).toEqual(expect.any(String));
    expect(auth.user.email).toBe(
      process.env.SMOKE_ADMIN_EMAIL ?? "admin@bitacora.local",
    );
  });

  it("creates a DailyLog and a DailyLogEvent while editable", async () => {
    const dailyLog = await createTrackedDailyLog("create-event");
    const event = await createDailyLogEvent(app, token, {
      dailyLogId: dailyLog.id,
      eventTypeId,
    });

    expect(event.dailyLogId).toBe(dailyLog.id);
  });

  it("submits, approves, and closes a DailyLog", async () => {
    const dailyLog = await createTrackedDailyLog("happy-path");
    await createDailyLogEvent(app, token, {
      dailyLogId: dailyLog.id,
      eventTypeId,
    });

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/submit`)
      .set(authHeader(token))
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("IN_REVIEW");
      });

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/approve`)
      .set(authHeader(token))
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("APPROVED");
      });

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/close`)
      .set(authHeader(token))
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("CLOSED");
        expect(body.closedAt).toEqual(expect.any(String));
      });
  });

  it("blocks approve and close from DRAFT", async () => {
    const dailyLog = await createTrackedDailyLog("invalid-from-draft");

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/approve`)
      .set(authHeader(token))
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toContain("Invalid daily log transition from DRAFT");
      });

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/close`)
      .set(authHeader(token))
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toContain("Invalid daily log transition from DRAFT");
      });
  });

  it("blocks duplicate submit", async () => {
    const dailyLog = await createTrackedDailyLog("duplicate-submit");

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/submit`)
      .set(authHeader(token))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/submit`)
      .set(authHeader(token))
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toContain(
          "Invalid daily log transition from IN_REVIEW",
        );
      });
  });

  it("blocks event editing and attachment upload after CLOSED", async () => {
    const dailyLog = await createTrackedDailyLog("closed-blocks");
    const event = await createDailyLogEvent(app, token, {
      dailyLogId: dailyLog.id,
      eventTypeId,
    });

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/submit`)
      .set(authHeader(token))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/approve`)
      .set(authHeader(token))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/close`)
      .set(authHeader(token))
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/daily-log-events/${event.id}`)
      .set(authHeader(token))
      .send({
        activity: "Should be blocked",
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe(
          "Daily log events can only be edited while the daily log is DRAFT.",
        );
      });

    const attachmentResponse = await uploadPdfAttachment(
      app,
      token,
      event.id,
      400,
    );

    expect(attachmentResponse.status).toBe(400);
    expect(attachmentResponse.body).toBeDefined();
    expect(attachmentResponse.body.message).toBe(
      "Attachments can only be uploaded while the daily log is editable.",
    );
  });

  it("rejects and returns to draft for correction and resubmission", async () => {
    const dailyLog = await createTrackedDailyLog("return-to-draft");
    const event = await createDailyLogEvent(app, token, {
      dailyLogId: dailyLog.id,
      eventTypeId,
    });

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/submit`)
      .set(authHeader(token))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/reject`)
      .set(authHeader(token))
      .send({
        comment: "Needs correction",
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("REJECTED");
      });

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/return-to-draft`)
      .set(authHeader(token))
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe("DRAFT");
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/daily-log-events/${event.id}`)
      .set(authHeader(token))
      .send({
        executionDescription: "Corrected after return to draft.",
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/submit`)
      .set(authHeader(token))
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe("IN_REVIEW");
      });
  });

  it("rejects return-to-draft when DailyLog is not REJECTED", async () => {
    const dailyLog = await createTrackedDailyLog("invalid-return-to-draft");

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/return-to-draft`)
      .set(authHeader(token))
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toBe("DailyLog must be REJECTED to return to DRAFT.");
      });
  });
});
