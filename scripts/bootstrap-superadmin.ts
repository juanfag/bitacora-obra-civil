import "dotenv/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaClient, RecordStatus, UserStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";

const SUPERADMIN_EMAIL = "admin@bitacora.local";
const SUPERADMIN_PASSWORD =
  process.env.BOOTSTRAP_SUPERADMIN_PASSWORD || "Password123!";
const DEMO_ORGANIZATION_NIT = "900000000-1";
const DEMO_PROJECT_CODE = "PROY-DEMO-001";

const requiredPermissions = [
  "organizations:create",
  "organizations:read",
  "organizations:update",
  "organizations:delete",
  "projects:create",
  "projects:read",
  "projects:update",
  "projects:delete",
  "daily-logs:create",
  "daily-logs:read",
  "daily-logs:update",
  "daily-logs:delete",
  "events:create",
  "events:read",
  "events:update",
  "events:delete",
  "daily-log-events:create",
  "daily-log-events:read",
  "daily-log-events:update",
  "daily-log-events:delete",
  "event-types:create",
  "event-types:read",
  "event-types:update",
  "event-types:delete",
  "roles:read",
  "roles:assign",
  "attachments:create",
  "attachments:read",
  "attachments:delete",
  "documents:create",
  "documents:read",
  "documents:update",
  "documents:delete",
  "users:create",
  "users:read",
  "users:update",
  "users:delete",
  "users:manage",
  "users:password:reset",
];

const permissionLabels: Record<string, string> = {
  "roles:read": "Read roles",
  "roles:assign": "Assign roles",
  "users:create": "Create users",
  "users:read": "Read users",
  "users:update": "Update users",
  "users:delete": "Delete users",
  "users:manage": "Manage users",
  "users:password:reset": "Reset user passwords",
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required to validate login JWT generation.");
  }

  const before = await prisma.user.findUnique({
    where: { email: SUPERADMIN_EMAIL },
    select: {
      id: true,
      status: true,
      passwordHash: true,
      tokenVersion: true,
    },
  });
  const passwordWasValid = before?.passwordHash
    ? await bcrypt.compare(SUPERADMIN_PASSWORD, before.passwordHash)
    : false;
  const shouldResetPassword = !passwordWasValid;
  const shouldReactivate = before?.status !== UserStatus.ACTIVE;
  const shouldIncrementTokenVersion = Boolean(before && shouldReactivate);
  const passwordHash = shouldResetPassword
    ? await bcrypt.hash(SUPERADMIN_PASSWORD, 10)
    : before?.passwordHash;

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.upsert({
      where: { nit: DEMO_ORGANIZATION_NIT },
      update: {
        name: "Organizacion Demo",
        status: RecordStatus.ACTIVE,
      },
      create: {
        nit: DEMO_ORGANIZATION_NIT,
        name: "Organizacion Demo",
        email: "demo@bitacora.local",
        phone: "3000000000",
        status: RecordStatus.ACTIVE,
      },
    });

    const admin = await tx.user.upsert({
      where: { email: SUPERADMIN_EMAIL },
      update: {
        fullName: "Administrador Demo",
        status: UserStatus.ACTIVE,
        blockedReason: null,
        statusChangedAt: shouldReactivate ? new Date() : undefined,
        passwordHash,
        tokenVersion: shouldIncrementTokenVersion
          ? { increment: 1 }
          : undefined,
      },
      create: {
        email: SUPERADMIN_EMAIL,
        fullName: "Administrador Demo",
        passwordHash: passwordHash ?? (await bcrypt.hash(SUPERADMIN_PASSWORD, 10)),
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        tokenVersion: true,
      },
    });

    const project = await tx.project.upsert({
      where: {
        organizationId_code: {
          organizationId: organization.id,
          code: DEMO_PROJECT_CODE,
        },
      },
      update: {
        name: "Proyecto Demo Bitacora de Obra",
        description: "Proyecto inicial para pruebas de la plataforma",
        location: "Medellin, Colombia",
        status: "ACTIVE",
        createdById: admin.id,
      },
      create: {
        organizationId: organization.id,
        code: DEMO_PROJECT_CODE,
        name: "Proyecto Demo Bitacora de Obra",
        description: "Proyecto inicial para pruebas de la plataforma",
        location: "Medellin, Colombia",
        status: "ACTIVE",
        createdById: admin.id,
      },
      select: {
        id: true,
        code: true,
      },
    });

    const superAdminRole = await tx.role.upsert({
      where: { code: "SUPER_ADMIN" },
      update: {
        name: "Super Admin",
        description: "Full platform administration access.",
        status: RecordStatus.ACTIVE,
      },
      create: {
        code: "SUPER_ADMIN",
        name: "Super Admin",
        description: "Full platform administration access.",
        status: RecordStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
        status: true,
      },
    });

    for (const code of requiredPermissions) {
      await tx.permission.upsert({
        where: { code },
        update: {
          name: permissionLabels[code] ?? toPermissionName(code),
          description: `Allows ${code.replace(":", " ")}.`,
          status: RecordStatus.ACTIVE,
        },
        create: {
          code,
          name: permissionLabels[code] ?? toPermissionName(code),
          description: `Allows ${code.replace(":", " ")}.`,
          status: RecordStatus.ACTIVE,
        },
      });
    }

    const permissions = await tx.permission.findMany({
      where: {
        code: { in: requiredPermissions },
        status: RecordStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
      },
    });

    for (const permission of permissions) {
      await tx.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      });
    }

    const projectUser = await tx.projectUser.upsert({
      where: {
        projectId_userId_roleId: {
          projectId: project.id,
          userId: admin.id,
          roleId: superAdminRole.id,
        },
      },
      update: {
        status: RecordStatus.ACTIVE,
        assignedById: admin.id,
      },
      create: {
        projectId: project.id,
        userId: admin.id,
        roleId: superAdminRole.id,
        assignedById: admin.id,
        status: RecordStatus.ACTIVE,
      },
      select: {
        id: true,
        status: true,
      },
    });

    return {
      admin,
      project,
      projectUser,
      superAdminRole,
      permissionCount: permissions.length,
    };
  });

  const validation = await validateSuperAdmin(result.admin.id);

  if (!validation.ok) {
    throw new Error(
      `SUPER_ADMIN bootstrap validation failed: ${validation.errors.join("; ")}`,
    );
  }

  const jwtService = new JwtService({ secret: process.env.JWT_SECRET });
  const jwtPayload = {
    sub: result.admin.id,
    email: result.admin.email,
    fullName: result.admin.fullName,
    status: result.admin.status,
    tokenVersion: result.admin.tokenVersion,
  };
  const accessToken = await jwtService.signAsync(jwtPayload);
  const decodedToken = jwtService.verify(accessToken);

  if (
    decodedToken.sub !== jwtPayload.sub ||
    decodedToken.email !== jwtPayload.email ||
    decodedToken.status !== UserStatus.ACTIVE ||
    decodedToken.tokenVersion !== jwtPayload.tokenVersion
  ) {
    throw new Error("JWT validation failed after SUPER_ADMIN bootstrap.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        user: {
          email: result.admin.email,
          status: result.admin.status,
          isActive: result.admin.status === UserStatus.ACTIVE,
          tokenVersion: result.admin.tokenVersion,
        },
        role: {
          code: result.superAdminRole.code,
          status: result.superAdminRole.status,
        },
        project: result.project,
        permissions: validation.permissionCodes,
        password: shouldResetPassword
          ? "reset-to-bootstrap-password"
          : "kept-existing-bootstrap-password",
        loginJwt: {
          generated: true,
          verified: true,
          payload: {
            sub: result.admin.id,
            email: result.admin.email,
            status: result.admin.status,
            tokenVersion: result.admin.tokenVersion,
          },
        },
      },
      null,
      2,
    ),
  );
}

async function validateSuperAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      status: true,
      tokenVersion: true,
      passwordHash: true,
      projectAssignments: {
        where: {
          status: RecordStatus.ACTIVE,
          role: {
            code: "SUPER_ADMIN",
            status: RecordStatus.ACTIVE,
          },
        },
        select: {
          role: {
            select: {
              code: true,
              status: true,
              rolePermissions: {
                where: {
                  permission: {
                    status: RecordStatus.ACTIVE,
                  },
                },
                select: {
                  permission: {
                    select: {
                      code: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  const errors: string[] = [];

  if (!user) {
    return { ok: false, errors: ["admin user not found"], permissionCodes: [] };
  }

  if (user.status !== UserStatus.ACTIVE) {
    errors.push("admin user is not ACTIVE");
  }

  if (!user.passwordHash) {
    errors.push("admin user has no passwordHash");
  }

  const passwordValid = user.passwordHash
    ? await bcrypt.compare(SUPERADMIN_PASSWORD, user.passwordHash)
    : false;

  if (!passwordValid) {
    errors.push("bootstrap password validation failed");
  }

  if (user.projectAssignments.length === 0) {
    errors.push("active SUPER_ADMIN assignment not found");
  }

  const permissionCodes = [
    ...new Set(
      user.projectAssignments.flatMap((assignment) =>
        assignment.role.rolePermissions.map(
          (rolePermission) => rolePermission.permission.code,
        ),
      ),
    ),
  ].sort();
  const missingPermissions = requiredPermissions.filter(
    (permission) => !permissionCodes.includes(permission),
  );

  if (missingPermissions.length > 0) {
    errors.push(`missing permissions: ${missingPermissions.join(", ")}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    permissionCodes,
  };
}

function toPermissionName(code: string) {
  return code
    .split(/[:-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
