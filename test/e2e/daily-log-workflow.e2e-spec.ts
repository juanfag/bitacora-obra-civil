import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../../apps/api/src/prisma/prisma.service";
import { authHeader, loginAsDemoAdmin } from "./helpers/auth.helper";
import {
  cleanupDailyLogGraph,
  cleanupSmokeProjects,
} from "./helpers/cleanup.helper";
import { createSmokeTestApp } from "./helpers/app.helper";
import {
  createDailyLog,
  createDailyLogEvent,
  uploadPdfAttachment,
} from "./helpers/daily-log.helper";
import {
  createSmokeProject,
  getSmokeEventTypeId,
  uniqueFutureDate,
} from "./helpers/data.helper";

describe("DailyLog workflow smoke", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let adminUserId: string;
  let eventTypeId: string;
  const createdDailyLogIds: string[] = [];
  const createdProjectIds: string[] = [];
  const runId = `smoke-${Date.now()}`;

  beforeAll(async () => {
    const testApp = await createSmokeTestApp();
    app = testApp.app;
    prisma = testApp.prisma;

    const auth = await loginAsDemoAdmin(app);
    token = auth.token;
    adminUserId = auth.user.id;
    eventTypeId = await getSmokeEventTypeId(prisma);
  });

  afterAll(async () => {
    await cleanupDailyLogGraph(prisma, createdDailyLogIds);
    await cleanupSmokeProjects(prisma, createdProjectIds);
    await app.close();
  });

  async function createTrackedProject(name: string) {
    const projectId = await createSmokeProject(
      prisma,
      adminUserId,
      `${runId}-${name}`,
    );

    createdProjectIds.push(projectId);

    return projectId;
  }

  async function createTrackedDailyLog(
    name: string,
    options?: {
      projectId?: string;
      logDate?: string;
    },
  ) {
    const targetProjectId =
      options?.projectId ?? (await createTrackedProject(name));
    const dailyLog = await createDailyLog(app, token, {
      projectId: targetProjectId,
      logDate: options?.logDate ?? uniqueFutureDate(`${runId}-${name}`),
      comments: `Smoke ${name}`,
    });

    createdDailyLogIds.push(dailyLog.id);

    return dailyLog;
  }

  function dateForWeekday(weekday: number, offsetWeeks = 0) {
    const date = new Date(Date.UTC(2100, 0, 1 + offsetWeeks * 7));

    while (date.getUTCDay() !== weekday) {
      date.setUTCDate(date.getUTCDate() + 1);
    }

    return date.toISOString().split("T")[0];
  }

  function addDays(dateString: string, days: number) {
    const date = new Date(`${dateString}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);

    return date.toISOString().split("T")[0];
  }

  async function closeDailyLog(dailyLogId: string) {
    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLogId}/submit`)
      .set(authHeader(token))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLogId}/approve`)
      .set(authHeader(token))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLogId}/close`)
      .set(authHeader(token))
      .expect(201);
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

  it("blocks duplicate DailyLog creation for the same project and work date", async () => {
    const duplicateProjectId = await createTrackedProject("duplicate-daily-log");
    const logDate = uniqueFutureDate(`${runId}-duplicate-daily-log`);
    const dailyLog = await createTrackedDailyLog("duplicate-daily-log", {
      projectId: duplicateProjectId,
      logDate,
    });

    await request(app.getHttpServer())
      .post("/api/v1/daily-logs")
      .set(authHeader(token))
      .send({
        projectId: duplicateProjectId,
        logDate,
        comments: "Duplicate attempt",
      })
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toBe(
          "A daily log already exists for this project and date.",
        );
      });

    expect(dailyLog.status).toBe("DRAFT");
  });

  it("blocks creating a DailyLog when the previous required work day is not CLOSED", async () => {
    const sequenceProjectId = await createTrackedProject("previous-not-closed");
    const firstDate = dateForWeekday(1, 1);
    const secondDate = addDays(firstDate, 1);

    await createTrackedDailyLog("previous-not-closed-first", {
      projectId: sequenceProjectId,
      logDate: firstDate,
    });

    await request(app.getHttpServer())
      .post("/api/v1/daily-logs")
      .set(authHeader(token))
      .send({
        projectId: sequenceProjectId,
        logDate: secondDate,
        comments: "Should be blocked until previous day is closed",
      })
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toBe(
          "Previous required work day daily log must be CLOSED before creating a new daily log.",
        );
      });
  });

  it("allows creating a DailyLog after the previous required work day is CLOSED", async () => {
    const sequenceProjectId = await createTrackedProject("previous-closed");
    const firstDate = dateForWeekday(1, 2);
    const secondDate = addDays(firstDate, 1);
    const firstDailyLog = await createTrackedDailyLog("previous-closed-first", {
      projectId: sequenceProjectId,
      logDate: firstDate,
    });

    await closeDailyLog(firstDailyLog.id);

    const secondDailyLog = await createTrackedDailyLog("previous-closed-second", {
      projectId: sequenceProjectId,
      logDate: secondDate,
    });

    expect(secondDailyLog.status).toBe("DRAFT");
  });

  it("skips Sunday when validating the previous required work day", async () => {
    const sequenceProjectId = await createTrackedProject("sunday-skip");
    const saturday = dateForWeekday(6, 3);
    const monday = addDays(saturday, 2);
    const saturdayDailyLog = await createTrackedDailyLog(
      "sunday-skip-saturday",
      {
        projectId: sequenceProjectId,
        logDate: saturday,
      },
    );

    await closeDailyLog(saturdayDailyLog.id);

    const mondayDailyLog = await createTrackedDailyLog("sunday-skip-monday", {
      projectId: sequenceProjectId,
      logDate: monday,
    });

    expect(mondayDailyLog.status).toBe("DRAFT");
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
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toContain("Invalid daily log transition from DRAFT");
      });

    await request(app.getHttpServer())
      .post(`/api/v1/daily-logs/${dailyLog.id}/close`)
      .set(authHeader(token))
      .expect(409)
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
      .expect(409)
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
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toBe(
          "Daily log events can only be edited while the daily log is DRAFT.",
        );
      });

    const attachmentResponse = await uploadPdfAttachment(
      app,
      token,
      event.id,
      409,
    );

    expect(attachmentResponse.status).toBe(409);
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
