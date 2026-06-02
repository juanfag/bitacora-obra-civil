import { INestApplication } from "@nestjs/common";
import { RecordStatus, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { PrismaService } from "../../apps/api/src/prisma/prisma.service";
import { authHeader, loginAsDemoAdmin } from "./helpers/auth.helper";
import { cleanupSmokeProjects } from "./helpers/cleanup.helper";
import { createSmokeTestApp } from "./helpers/app.helper";
import { createSmokeProject } from "./helpers/data.helper";

describe("RBAC v2 hybrid guards", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let adminUserId: string;
  let v2Token: string;
  let legacyToken: string;
  let noPermissionToken: string;
  const createdProjectIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdRoleIds: string[] = [];
  const runId = `rbac-hybrid-${Date.now()}`;

  beforeAll(async () => {
    const testApp = await createSmokeTestApp();
    app = testApp.app;
    prisma = testApp.prisma;

    const auth = await loginAsDemoAdmin(app);
    adminToken = auth.token;
    adminUserId = auth.user.id;
    await ensureHybridPermissions();

    const projectId = await createTrackedProject("guard-project");
    const v2RoleId = await createRoleWithPermissions("v2", [
      "users:read",
      "roles:assign",
      "projects:read",
      "daily_logs:read",
      "daily_log_events:read",
      "dashboard:read",
    ]);
    const legacyRoleId = await createRoleWithPermissions("legacy", [
      "daily-logs:read",
    ]);
    const noPermissionRoleId = await createRoleWithPermissions("empty", []);

    v2Token = await createUserWithProjectRole("v2", v2RoleId, projectId);
    legacyToken = await createUserWithProjectRole(
      "legacy",
      legacyRoleId,
      projectId,
    );
    noPermissionToken = await createUserWithProjectRole(
      "empty",
      noPermissionRoleId,
      projectId,
    );
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: {
        entityId: {
          in: createdUserIds,
        },
      },
    });
    await prisma.projectUser.deleteMany({
      where: {
        OR: [
          {
            userId: {
              in: createdUserIds,
            },
          },
          {
            roleId: {
              in: createdRoleIds,
            },
          },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: createdUserIds,
        },
      },
    });
    await prisma.rolePermission.deleteMany({
      where: {
        roleId: {
          in: createdRoleIds,
        },
      },
    });
    await prisma.role.deleteMany({
      where: {
        id: {
          in: createdRoleIds,
        },
      },
    });

    await cleanupSmokeProjects(prisma, createdProjectIds);
    await app.close();
  });

  it("allows access with legacy permissions", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/daily-logs")
      .set(authHeader(legacyToken))
      .expect(200);
  });

  it("allows access with RBAC v2 equivalent permissions across critical modules", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/users")
      .set(authHeader(v2Token))
      .expect(200);

    await request(app.getHttpServer())
      .get("/api/v1/roles/assignable")
      .set(authHeader(v2Token))
      .expect(200);

    await request(app.getHttpServer())
      .get("/api/v1/projects")
      .set(authHeader(v2Token))
      .expect(200);

    await request(app.getHttpServer())
      .get("/api/v1/daily-logs")
      .set(authHeader(v2Token))
      .expect(200);

    await request(app.getHttpServer())
      .get("/api/v1/daily-log-events")
      .set(authHeader(v2Token))
      .expect(200);

    await request(app.getHttpServer())
      .get("/api/v1/dashboard/metrics")
      .set(authHeader(v2Token))
      .expect(200);
  });

  it("keeps endpoints protected when the user has no matching permission", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/daily-logs")
      .set(authHeader(noPermissionToken))
      .expect(403);
  });

  it("keeps SUPER_ADMIN access intact", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/users")
      .set(authHeader(adminToken))
      .expect(200);
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

  async function createRoleWithPermissions(
    label: string,
    permissionCodes: string[],
  ) {
    const role = await prisma.role.create({
      data: {
        code: `RBAC_HYBRID_${label.toUpperCase()}_${Date.now()}`,
        name: `RBAC Hybrid ${label}`,
        description: "Temporary role for RBAC hybrid guard validation.",
      },
      select: {
        id: true,
      },
    });
    createdRoleIds.push(role.id);

    if (permissionCodes.length) {
      const permissions = await prisma.permission.findMany({
        where: {
          code: {
            in: permissionCodes,
          },
          status: RecordStatus.ACTIVE,
        },
        select: {
          id: true,
          code: true,
        },
      });

      expect(permissions).toHaveLength(permissionCodes.length);

      await prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
      });
    }

    return role.id;
  }

  async function createUserWithProjectRole(
    label: string,
    roleId: string,
    projectId: string,
  ) {
    const password = "Password123!";
    const user = await prisma.user.create({
      data: {
        email: `${runId}-${label}@bitacora.local`,
        fullName: `RBAC Hybrid ${label}`,
        passwordHash: await bcrypt.hash(password, 10),
        status: UserStatus.ACTIVE,
        projectAssignments: {
          create: {
            projectId,
            roleId,
            assignedById: adminUserId,
          },
        },
      },
      select: {
        id: true,
        email: true,
      },
    });
    createdUserIds.push(user.id);

    const loginResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: user.email,
        password,
      })
      .expect(201);

    return loginResponse.body.accessToken as string;
  }

  async function ensureHybridPermissions() {
    const permissionCodes = [
      "users:read",
      "roles:assign",
      "projects:read",
      "daily_logs:read",
      "daily_log_events:read",
      "dashboard:read",
      "daily-logs:read",
    ];

    await Promise.all(
      permissionCodes.map((code) =>
        prisma.permission.upsert({
          where: {
            code,
          },
          update: {
            status: RecordStatus.ACTIVE,
          },
          create: {
            code,
            name: code,
            description: "Temporary permission ensured by RBAC hybrid e2e.",
          },
        }),
      ),
    );
  }
});
