import { AuditAction, UserStatus } from "@prisma/client";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../../apps/api/src/prisma/prisma.service";
import { authHeader, loginAsDemoAdmin } from "./helpers/auth.helper";
import { cleanupSmokeProjects } from "./helpers/cleanup.helper";
import { createSmokeTestApp } from "./helpers/app.helper";
import { createSmokeProject } from "./helpers/data.helper";

describe("RBAC audit trail", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let adminUserId: string;
  let viewerRoleId: string;
  let targetUserId: string | undefined;
  const createdProjectIds: string[] = [];
  const runId = `rbac-audit-${Date.now()}`;

  beforeAll(async () => {
    const testApp = await createSmokeTestApp();
    app = testApp.app;
    prisma = testApp.prisma;

    const auth = await loginAsDemoAdmin(app);
    token = auth.token;
    adminUserId = auth.user.id;

    const viewerRole = await prisma.role.findFirst({
      where: {
        code: "VIEWER",
      },
      select: {
        id: true,
      },
    });

    if (!viewerRole) {
      throw new Error("Role VIEWER was not found. Run prisma seed first.");
    }

    viewerRoleId = viewerRole.id;
  });

  afterAll(async () => {
    if (targetUserId) {
      await prisma.auditLog.deleteMany({
        where: {
          entityId: targetUserId,
        },
      });
      await prisma.projectUser.deleteMany({
        where: {
          userId: targetUserId,
        },
      });
      await prisma.user.delete({
        where: {
          id: targetUserId,
        },
      });
    }

    await cleanupSmokeProjects(prisma, createdProjectIds);
    await app.close();
  });

  it("audits role assignment, role removal, user blocking and project access snapshots", async () => {
    const firstProjectId = await createTrackedProject("first-project");
    const secondProjectId = await createTrackedProject("second-project");
    const email = `${runId}@bitacora.local`;

    const createUserResponse = await request(app.getHttpServer())
      .post("/api/v1/users")
      .set(authHeader(token))
      .send({
        fullName: "RBAC Audit Target",
        email,
        status: UserStatus.ACTIVE,
        password: "Password123!",
      })
      .expect(201);

    targetUserId = createUserResponse.body.id as string;

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${targetUserId}/roles`)
      .set(authHeader(token))
      .send({
        assignments: [
          {
            projectId: firstProjectId,
            roleId: viewerRoleId,
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${targetUserId}/roles`)
      .set(authHeader(token))
      .send({
        assignments: [
          {
            projectId: secondProjectId,
            roleId: viewerRoleId,
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${targetUserId}/status`)
      .set(authHeader(token))
      .send({
        status: UserStatus.BLOCKED,
        reason: "RBAC audit smoke validation",
      })
      .expect(200);

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityName: "RBAC",
        entityId: targetUserId,
        action: {
          in: [
            AuditAction.RBAC_ROLE_ASSIGNED,
            AuditAction.RBAC_ROLE_REMOVED,
            AuditAction.RBAC_PROJECT_ACCESS_GRANTED,
            AuditAction.RBAC_PROJECT_ACCESS_REMOVED,
            AuditAction.RBAC_USER_STATUS_CHANGED,
          ],
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    const actions = auditLogs.map((log) => log.action);

    expect(actions).toContain(AuditAction.RBAC_ROLE_ASSIGNED);
    expect(actions).toContain(AuditAction.RBAC_ROLE_REMOVED);
    expect(actions).toContain(AuditAction.RBAC_PROJECT_ACCESS_GRANTED);
    expect(actions).toContain(AuditAction.RBAC_PROJECT_ACCESS_REMOVED);
    expect(actions).toContain(AuditAction.RBAC_USER_STATUS_CHANGED);

    for (const log of auditLogs) {
      expect(log.actorNameSnapshot).toEqual(expect.any(String));
      expect(log.actorEmailSnapshot).toEqual(expect.any(String));
      expect(log.targetUserSnapshot).toBeTruthy();
      expect(log.metadata).toBeTruthy();
    }

    const roleAuditLog = auditLogs.find(
      (log) => log.action === AuditAction.RBAC_ROLE_ASSIGNED,
    );
    const projectAccessLog = auditLogs.find(
      (log) => log.action === AuditAction.RBAC_PROJECT_ACCESS_GRANTED,
    );
    const statusLog = auditLogs.find(
      (log) => log.action === AuditAction.RBAC_USER_STATUS_CHANGED,
    );

    expect(roleAuditLog?.roleSnapshot).toBeTruthy();
    expect(roleAuditLog?.scopeSnapshot).toBeTruthy();
    expect(projectAccessLog?.projectSnapshot).toBeTruthy();
    expect(statusLog?.oldValue).toMatchObject({
      status: UserStatus.ACTIVE,
    });
    expect(statusLog?.newValue).toMatchObject({
      status: UserStatus.BLOCKED,
    });
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
});
