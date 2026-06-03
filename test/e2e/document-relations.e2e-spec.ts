import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../../apps/api/src/prisma/prisma.service";
import { authHeader, loginAsDemoAdmin } from "./helpers/auth.helper";
import { createSmokeTestApp } from "./helpers/app.helper";
import { cleanupSmokeProjects } from "./helpers/cleanup.helper";
import {
  createSmokeProject,
  getSmokeEventTypeId,
  uniqueFutureDate,
} from "./helpers/data.helper";
import { createDailyLog, createDailyLogEvent } from "./helpers/daily-log.helper";

describe("Document relations with daily logs and events", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let adminUserId: string;
  const createdProjectIds: string[] = [];
  const runId = `document-relations-${Date.now()}`;

  beforeAll(async () => {
    const testApp = await createSmokeTestApp();
    app = testApp.app;
    prisma = testApp.prisma;

    const auth = await loginAsDemoAdmin(app);
    token = auth.token;
    adminUserId = auth.user.id;
  });

  afterAll(async () => {
    await cleanupSmokeProjects(prisma, createdProjectIds);
    await app.close();
  });

  it("relates an existing document to a daily log and event without creating versions", async () => {
    const projectId = await createTrackedProject();
    const dailyLog = await createDailyLog(app, token, {
      projectId,
      logDate: uniqueFutureDate(runId),
      comments: `${runId} daily log`,
    });
    const eventTypeId = await getSmokeEventTypeId(prisma);
    const dailyLogEvent = await createDailyLogEvent(app, token, {
      dailyLogId: dailyLog.id,
      eventTypeId,
    });

    const documentResponse = await request(app.getHttpServer())
      .post("/api/v1/documents")
      .set(authHeader(token))
      .send({
        projectId,
        type: "ACTA",
        title: `${runId} metadata document`,
        code: `${runId.slice(-10)}-DOC`,
        status: "ACTIVE",
        visibility: "PROJECT",
      })
      .expect(201);
    const documentId = documentResponse.body.id as string;

    const dailyLogRelationResponse = await request(app.getHttpServer())
      .post(`/api/v1/documents/${documentId}/relations`)
      .set(authHeader(token))
      .send({
        relationType: "DAILY_LOG",
        dailyLogId: dailyLog.id,
      })
      .expect(201);
    const dailyLogRelationId = dailyLogRelationResponse.body.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/documents/${documentId}/relations`)
      .set(authHeader(token))
      .send({
        relationType: "DAILY_LOG",
        dailyLogId: dailyLog.id,
      })
      .expect(400);

    await request(app.getHttpServer())
      .get(`/api/v1/daily-logs/${dailyLog.id}/documents`)
      .set(authHeader(token))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].document.id).toBe(documentId);
        expect(body[0].relation.id).toBe(dailyLogRelationId);
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/documents/${documentId}/relations/${dailyLogRelationId}`)
      .set(authHeader(token))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/daily-logs/${dailyLog.id}/documents`)
      .set(authHeader(token))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(0);
      });

    await request(app.getHttpServer())
      .post(`/api/v1/documents/${documentId}/relations`)
      .set(authHeader(token))
      .send({
        relationType: "DAILY_LOG_EVENT",
        dailyLogEventId: dailyLogEvent.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/daily-log-events/${dailyLogEvent.id}/documents`)
      .set(authHeader(token))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].document.id).toBe(documentId);
      });

    const [versionCount, relationAuditCount] = await Promise.all([
      prisma.documentVersion.count({
        where: {
          documentId,
        },
      }),
      prisma.auditLog.count({
        where: {
          entityName: "DocumentRelation",
          action: {
            in: ["DOCUMENT_RELATION_CREATED", "DOCUMENT_RELATION_DELETED"],
          },
        },
      }),
    ]);

    expect(versionCount).toBe(0);
    expect(relationAuditCount).toBeGreaterThanOrEqual(3);
  });

  async function createTrackedProject() {
    const projectId = await createSmokeProject(prisma, adminUserId, runId);
    createdProjectIds.push(projectId);

    return projectId;
  }
});
