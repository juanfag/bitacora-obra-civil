import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const roles = [
  {
    code: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Full platform administration access.",
  },
  {
    code: "PROJECT_MANAGER",
    name: "Project Manager",
    description: "Manages organizations and projects.",
  },
  {
    code: "SUPERVISOR",
    name: "Supervisor",
    description: "Supervises project execution and records.",
  },
  {
    code: "PROJECT_ADMIN",
    name: "Project Admin",
    description: "Administers an assigned project.",
  },
  {
    code: "AUDITOR",
    name: "Auditor",
    description: "Reads assigned project information and audit traces.",
  },
  {
    code: "INSPECTOR",
    name: "Inspector",
    description: "Inspects and reads assigned project information.",
  },
  {
    code: "VIEWER",
    name: "Viewer",
    description: "Read-only access.",
  },
];

const permissions = [
  {
    code: "organizations:create",
    name: "Create organizations",
    description: "Allows creating organizations.",
  },
  {
    code: "organizations:read",
    name: "Read organizations",
    description: "Allows reading organizations.",
  },
  {
    code: "organizations:update",
    name: "Update organizations",
    description: "Allows updating organizations.",
  },
  {
    code: "organizations:delete",
    name: "Delete organizations",
    description: "Allows soft deleting organizations.",
  },
  {
    code: "projects:create",
    name: "Create projects",
    description: "Allows creating projects.",
  },
  {
    code: "projects:read",
    name: "Read projects",
    description: "Allows reading projects.",
  },
  {
    code: "projects:update",
    name: "Update projects",
    description: "Allows updating projects.",
  },
  {
    code: "projects:delete",
    name: "Delete projects",
    description: "Allows soft deleting projects.",
  },
  {
    code: "daily-logs:create",
    name: "Create daily logs",
    description: "Allows creating daily logs.",
  },
  {
    code: "daily-logs:read",
    name: "Read daily logs",
    description: "Allows reading daily logs.",
  },
  {
    code: "daily-logs:update",
    name: "Update daily logs",
    description: "Allows updating daily logs.",
  },
  {
    code: "daily-logs:delete",
    name: "Delete daily logs",
    description: "Allows soft deleting daily logs.",
  },
  {
    code: "events:create",
    name: "Create events",
    description: "Allows creating events.",
  },
  {
    code: "events:read",
    name: "Read events",
    description: "Allows reading events.",
  },
  {
    code: "events:update",
    name: "Update events",
    description: "Allows updating events.",
  },
  {
    code: "events:delete",
    name: "Delete events",
    description: "Allows soft deleting events.",
  },
  {
    code: "daily-log-events:create",
    name: "Create daily log events",
    description: "Allows creating daily log events.",
  },
  {
    code: "daily-log-events:read",
    name: "Read daily log events",
    description: "Allows reading daily log events.",
  },
  {
    code: "daily-log-events:update",
    name: "Update daily log events",
    description: "Allows updating daily log events.",
  },
  {
    code: "daily-log-events:delete",
    name: "Delete daily log events",
    description: "Allows soft deleting daily log events.",
  },
  {
    code: "event-types:create",
    name: "Create event types",
    description: "Allows creating event types.",
  },
  {
    code: "event-types:read",
    name: "Read event types",
    description: "Allows reading event types.",
  },
  {
    code: "event-types:update",
    name: "Update event types",
    description: "Allows updating event types.",
  },
  {
    code: "event-types:delete",
    name: "Delete event types",
    description: "Allows soft deleting event types.",
  },
  {
    code: "roles:read",
    name: "Read roles",
    description: "Allows reading role catalogs.",
  },
  {
    code: "roles:assign",
    name: "Assign roles",
    description: "Allows assigning roles to users.",
  },
  {
    code: "users:create",
    name: "Create users",
    description: "Allows creating users.",
  },
  {
    code: "users:read",
    name: "Read users",
    description: "Allows reading users.",
  },
  {
    code: "users:update",
    name: "Update users",
    description: "Allows updating users.",
  },
  {
    code: "users:delete",
    name: "Delete users",
    description: "Allows soft deleting users.",
  },
  {
    code: "users:manage",
    name: "Manage users",
    description: "Allows administrative user management.",
  },
  {
    code: "users:password:reset",
    name: "Reset user passwords",
    description: "Allows resetting another user's password.",
  },
  {
    code: "attachments:create",
    name: "Create attachments",
    description: "Allows uploading attachments.",
  },
  {
    code: "attachments:read",
    name: "Read attachments",
    description: "Allows reading attachments.",
  },
  {
    code: "attachments:delete",
    name: "Delete attachments",
    description: "Allows soft deleting attachments.",
  },
  {
    code: "documents:create",
    name: "Create documents",
    description: "Allows creating document-control records.",
  },
  {
    code: "documents:read",
    name: "Read documents",
    description: "Allows reading document-control records.",
  },
  {
    code: "documents:update",
    name: "Update documents",
    description: "Allows updating document-control records.",
  },
  {
    code: "documents:delete",
    name: "Delete documents",
    description: "Allows soft deleting document-control records.",
  },
  {
    code: "audit:read",
    name: "Read audit",
    description: "Allows reading audit traces.",
  },
];

const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: permissions.map((permission) => permission.code),
  PROJECT_MANAGER: [
    "organizations:read",
    "organizations:update",
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
    "attachments:create",
    "attachments:read",
    "attachments:delete",
    "documents:create",
    "documents:read",
    "documents:update",
    "documents:delete",
  ],
  SUPERVISOR: [
    "organizations:read",
    "projects:read",
    "projects:update",
    "daily-logs:create",
    "daily-logs:read",
    "daily-logs:update",
    "events:create",
    "events:read",
    "events:update",
    "daily-log-events:create",
    "daily-log-events:read",
    "daily-log-events:update",
    "event-types:read",
    "attachments:create",
    "attachments:read",
    "attachments:delete",
    "documents:create",
    "documents:read",
    "documents:update",
  ],
  PROJECT_ADMIN: [
    "organizations:read",
    "projects:read",
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
    "event-types:read",
    "attachments:create",
    "attachments:read",
    "documents:create",
    "documents:read",
    "documents:update",
    "documents:delete",
    "audit:read",
  ],
  AUDITOR: [
    "organizations:read",
    "projects:read",
    "daily-logs:read",
    "events:read",
    "daily-log-events:read",
    "event-types:read",
    "attachments:read",
    "documents:read",
    "audit:read",
  ],
  INSPECTOR: [
    "organizations:read",
    "projects:read",
    "daily-logs:create",
    "daily-logs:read",
    "events:create",
    "events:read",
    "daily-log-events:create",
    "daily-log-events:read",
    "event-types:read",
    "attachments:create",
    "attachments:read",
    "documents:create",
    "documents:read",
  ],
  VIEWER: [
    "organizations:read",
    "projects:read",
    "daily-logs:read",
    "events:read",
    "daily-log-events:read",
    "event-types:read",
    "attachments:read",
    "documents:read",
  ],
};

const eventTypes = [
  { code: "WORK_PROGRESS", name: "Avance de obra" },
  { code: "ACTIVITY_EXECUTION", name: "Activity Execution" },
  { code: "INCIDENT", name: "Incident" },
  { code: "ACCIDENT", name: "Accidente" },
  { code: "WEATHER_CONDITION", name: "Cambio climático" },
  { code: "MATERIAL_DELIVERY", name: "Entrega de material" },
  { code: "EQUIPMENT_ENTRY", name: "Equipment Entry" },
  { code: "EQUIPMENT_EXIT", name: "Equipment Exit" },
  { code: "TECHNICAL_INSTRUCTION", name: "Technical Instruction" },
  { code: "SUSPENSION_REQUEST", name: "Suspension Request" },
  { code: "WORK_SUSPENSION", name: "Suspensión" },
  { code: "WORK_RESUMPTION", name: "Work Resumption" },
  { code: "SITE_VISIT", name: "Visita técnica" },
  { code: "LEGAL_CLAIM", name: "Legal Claim" },
  { code: "COMPLAINT", name: "Complaint" },
  { code: "FINDING", name: "Hallazgo" },
  { code: "INSPECTION", name: "Inspección" },
  { code: "NONCOMPLIANCE", name: "Incumplimiento" },
  { code: "SST_RISK", name: "Riesgo SST" },
  { code: "DELAY", name: "Retraso" },
  { code: "OTHER", name: "Otro" },
];

const documentTypes = [
  "PHOTO",
  "PLAN",
  "TECHNICAL_REPORT",
  "ACT",
  "SUSPENSION_REQUEST",
  "COMPLAINT",
  "LEGAL_CLAIM",
  "LICENSE",
  "CONTRACT",
  "POLICY",
  "QUALITY_CERTIFICATE",
  "MATERIAL_SUPPORT",
  "GENERATED_DAILY_LOG_PDF",
  "SIGNED_DAILY_LOG_PDF",
  "OTHER",
];

const toName = (code: string) =>
  code
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");

async function seedBaseCatalogs() {
  console.log("Loading base catalogs...");

  await Promise.all(
    roles.map((role) =>
      prisma.role.upsert({
        where: { code: role.code },
        update: {
          name: role.name,
          description: role.description,
        },
        create: role,
      }),
    ),
  );

  await Promise.all(
    permissions.map((permission) =>
      prisma.permission.upsert({
        where: { code: permission.code },
        update: {
          name: permission.name,
          description: permission.description,
        },
        create: permission,
      }),
    ),
  );

  await seedRolePermissions();
  await upsertCatalogEntries(prisma.eventType, eventTypes);
    await upsertCatalogByCode(prisma.documentTypeCatalog, documentTypes);

  console.log("Base catalogs loaded.");
}

async function seedRolePermissions() {
  const persistedRoles = await prisma.role.findMany({
    where: {
      code: {
        in: Object.keys(rolePermissions),
      },
    },
    select: {
      id: true,
      code: true,
    },
  });

  const persistedPermissions = await prisma.permission.findMany({
    where: {
      code: {
        in: permissions.map((permission) => permission.code),
      },
    },
    select: {
      id: true,
      code: true,
    },
  });

  const roleByCode = new Map(
    persistedRoles.map((role) => [role.code, role]),
  );
  const permissionByCode = new Map(
    persistedPermissions.map((permission) => [permission.code, permission]),
  );

  for (const [roleCode, permissionCodes] of Object.entries(rolePermissions)) {
    const role = roleByCode.get(roleCode);

    if (!role) {
      throw new Error(`Role not found: ${roleCode}`);
    }

    await Promise.all(
      permissionCodes.map((permissionCode) => {
        const permission = permissionByCode.get(permissionCode);

        if (!permission) {
          throw new Error(`Permission not found: ${permissionCode}`);
        }

        return prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }),
    );
  }
}

async function upsertCatalogByCode(
  model: {
    upsert: (args: {
      where: { code: string };
      update: { name: string };
      create: { code: string; name: string };
    }) => Promise<unknown>;
  },
  codes: string[],
) {
  await Promise.all(
    codes.map((code) => {
      const name = toName(code);

      return model.upsert({
        where: { code },
        update: { name },
        create: { code, name },
      });
    }),
  );
}

async function upsertCatalogEntries(
  model: {
    upsert: (args: {
      where: { code: string };
      update: { name: string };
      create: { code: string; name: string };
    }) => Promise<unknown>;
  },
  entries: Array<{ code: string; name: string }>,
) {
  await Promise.all(
    entries.map((entry) =>
      model.upsert({
        where: { code: entry.code },
        update: { name: entry.name },
        create: entry,
      }),
    ),
  );
}

async function seedDemoData() {
  console.log("Loading demo data...");

  const organization = await prisma.organization.upsert({
    where: {
      nit: "900000000-1",
    },
    update: {
      name: "Organizacion Demo",
      email: "demo@bitacora.local",
      phone: "3000000000",
    },
    create: {
      nit: "900000000-1",
      name: "Organizacion Demo",
      email: "demo@bitacora.local",
      phone: "3000000000",
    },
  });

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const adminUser = await prisma.user.upsert({
    where: {
      email: "admin@bitacora.local",
    },
    update: {
      passwordHash,
      fullName: "Administrador Demo",
    },
    create: {
      email: "admin@bitacora.local",
      fullName: "Administrador Demo",
      passwordHash,
    },
  });

  const superAdminRole = await prisma.role.findUnique({
    where: {
      code: "SUPER_ADMIN",
    },
  });

  if (!superAdminRole) {
    throw new Error("Role not found: SUPER_ADMIN");
  }

  const project = await prisma.project.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: "PROY-DEMO-001",
      },
    },
    update: {
      name: "Proyecto Demo Bitacora de Obra",
      description: "Proyecto inicial para pruebas de la plataforma",
      location: "Medellin, Colombia",
      status: "ACTIVE",
      createdById: adminUser.id,
    },
    create: {
      organizationId: organization.id,
      code: "PROY-DEMO-001",
      name: "Proyecto Demo Bitacora de Obra",
      description: "Proyecto inicial para pruebas de la plataforma",
      location: "Medellin, Colombia",
      status: "ACTIVE",
      createdById: adminUser.id,
    },
  });

  await prisma.projectUser.upsert({
    where: {
      projectId_userId_roleId: {
        projectId: project.id,
        userId: adminUser.id,
        roleId: superAdminRole.id,
      },
    },
    update: {
      status: "ACTIVE",
      assignedById: adminUser.id,
    },
    create: {
      projectId: project.id,
      userId: adminUser.id,
      roleId: superAdminRole.id,
      assignedById: adminUser.id,
    },
  });

  console.log("Demo data loaded.");
}

async function main() {
  console.log("Starting seed...");

  await seedBaseCatalogs();
  await seedDemoData();

  console.log("Seed finished successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Error running seed:");
    console.error(error);

    await prisma.$disconnect();
    process.exit(1);
  });
