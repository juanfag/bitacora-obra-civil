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
import { createDailyLog } from "./helpers/daily-log.helper";

describe("Document audit visibility", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let adminUserId: string;
  const createdProjectIds: string[] = [];
  const runId = `document-audit-${Date.now()}`;

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

  it("returns a sanitized document audit timeline", async () => {
    const projectId = await createTrackedProject();
    const dailyLog = await createDailyLog(app, token, {
      projectId,
      logDate: uniqueFutureDate(runId),
      comments: `${runId} daily log`,
    });
    await getSmokeEventTypeId(prisma);

    const createResponse = await request(app.getHttpServer())
      .post("/api/v1/documents")
      .set(authHeader(token))
      .send({
        projectId,
        type: "ACTA",
        title: `${runId} document`,
        code: `${runId.slice(-10)}-AUD`,
        status: "ACTIVE",
        visibility: "PROJECT",
      })
      .expect(201);
    const documentId = createResponse.body.id as string;

    await request(app.getHttpServer())
      .patch(`/api/v1/documents/${documentId}`)
      .set(authHeader(token))
      .send({
        title: `${runId} document updated`,
      })
      .expect(200);

    await request(app.getHttpServer())
      .post("/api/v1/documents/upload")
      .set(authHeader(token))
      .field("documentId", documentId)
      .field("projectId", projectId)
      .field("type", "ACTA")
      .field("title", `${runId} document updated`)
      .attach("file", Buffer.from("%PDF-1.4\nAudit document\n%%EOF"), {
        filename: `${runId}.pdf`,
        contentType: "application/pdf",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/documents/${documentId}/relations`)
      .set(authHeader(token))
      .send({
        relationType: "DAILY_LOG",
        dailyLogId: dailyLog.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/documents/${documentId}/download`)
      .set(authHeader(token))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/documents/${documentId}/audit`)
      .set(authHeader(token))
      .expect(200)
      .expect(({ body }) => {
        const actions = body.items.map((item: { action: string }) => item.action);
        expect(actions).toEqual(
          expect.arrayContaining([
            "DOCUMENT_CREATED",
            "DOCUMENT_UPDATED",
            "DOCUMENT_VERSION_CREATED",
            "DOCUMENT_RELATION_CREATED",
            "DOCUMENT_DOWNLOADED",
          ]),
        );
        expect(body.order).toBe("createdAt:desc");
        expect(JSON.stringify(body)).not.toContain("storagePath");
        expect(JSON.stringify(body)).not.toContain("storage/");
        expect(body.items[0]).toEqual(
          expect.objectContaining({
            entityType: expect.any(String),
            entityId: expect.any(String),
            performedBy: expect.objectContaining({
              id: expect.any(String),
            }),
            createdAt: expect.any(String),
          }),
        );
      });
  });

  async function createTrackedProject() {
    const projectId = await createSmokeProject(prisma, adminUserId, runId);
    createdProjectIds.push(projectId);

    return projectId;
  }
});
