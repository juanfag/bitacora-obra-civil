import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../../apps/api/src/prisma/prisma.service";
import { authHeader, loginAsDemoAdmin } from "./helpers/auth.helper";
import { createSmokeTestApp } from "./helpers/app.helper";
import { cleanupSmokeProjects } from "./helpers/cleanup.helper";
import { createSmokeProject } from "./helpers/data.helper";

describe("Document versions enterprise upload", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let adminUserId: string;
  const createdProjectIds: string[] = [];
  const runId = `document-versions-${Date.now()}`;

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

  it("creates V1 and V2, updates current version, downloads by version and keeps files after soft delete", async () => {
    const projectId = await createTrackedProject();
    const v1Buffer = Buffer.from("%PDF-1.4\nDocument version one\n%%EOF");
    const v2Buffer = Buffer.from("%PDF-1.4\nDocument version two\n%%EOF");

    const uploadV1 = await request(app.getHttpServer())
      .post("/api/v1/documents/upload")
      .set(authHeader(token))
      .field("projectId", projectId)
      .field("type", "ACTA")
      .field("title", `${runId} acta`)
      .attach("file", v1Buffer, {
        filename: `${runId}-v1.pdf`,
        contentType: "application/pdf",
      })
      .expect(201);

    const documentId = uploadV1.body.id as string;
    const v1 = await prisma.documentVersion.findFirstOrThrow({
      where: {
        documentId,
        versionNumber: 1,
      },
    });

    expect(v1.isCurrentVersion).toBe(true);
    expect(v1.checksumSha256).toBe(sha256(v1Buffer));
    expect(v1.extension).toBe("pdf");
    expect(v1.originalFileName).toBe(`${runId}-v1.pdf`);

    const uploadV2 = await request(app.getHttpServer())
      .post("/api/v1/documents/upload")
      .set(authHeader(token))
      .field("documentId", documentId)
      .field("projectId", projectId)
      .field("type", "ACTA")
      .field("title", `${runId} acta`)
      .attach("file", v2Buffer, {
        filename: `${runId}-v2.pdf`,
        contentType: "application/pdf",
      })
      .expect(201);

    expect(uploadV2.body.id).toBe(documentId);

    const [document, versions] = await Promise.all([
      prisma.document.findUniqueOrThrow({
        where: {
          id: documentId,
        },
      }),
      prisma.documentVersion.findMany({
        where: {
          documentId,
        },
        orderBy: {
          versionNumber: "asc",
        },
      }),
    ]);

    expect(versions).toHaveLength(2);
    expect(versions[0].isCurrentVersion).toBe(false);
    expect(versions[1].isCurrentVersion).toBe(true);
    expect(versions[1].versionNumber).toBe(2);
    expect(versions[1].checksumSha256).toBe(sha256(v2Buffer));
    expect(document.currentVersionId).toBe(versions[1].id);

    await request(app.getHttpServer())
      .get(`/api/v1/documents/${documentId}/versions`)
      .set(authHeader(token))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(2);
        expect(body[0].versionNumber).toBe(2);
        expect(body[0].isCurrentVersion).toBe(true);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/document-versions/${versions[0].id}/download`)
      .set(authHeader(token))
      .expect(200)
      .expect((response) => {
        expect(response.headers["content-type"]).toBe("application/pdf");
        expect(response.headers["content-disposition"]).toContain("attachment");
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/documents/${documentId}`)
      .set(authHeader(token))
      .expect(200);

    await expect(
      access(join(process.cwd(), versions[0].storagePath ?? versions[0].storageKey), constants.R_OK),
    ).resolves.toBeUndefined();
    await expect(
      access(join(process.cwd(), versions[1].storagePath ?? versions[1].storageKey), constants.R_OK),
    ).resolves.toBeUndefined();
  });

  async function createTrackedProject() {
    const projectId = await createSmokeProject(prisma, adminUserId, runId);
    createdProjectIds.push(projectId);

    return projectId;
  }
});

function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
