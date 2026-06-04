import "dotenv/config";
import {
  DailyLogStatus,
  DocumentStatus,
  DocumentType,
  DocumentVisibility,
  PrismaClient,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";
import {
  rbacV2Permissions,
  type SeedPermission,
} from "./rbac-v2-permission-catalog";

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

const mergePermissions = (...permissionGroups: SeedPermission[]) => {
  const permissionByCode = new Map<string, SeedPermission>();

  for (const permission of permissionGroups) {
    if (!permissionByCode.has(permission.code)) {
      permissionByCode.set(permission.code, permission);
    }
  }

  return Array.from(permissionByCode.values());
};

const seedPermissions = mergePermissions(...permissions, ...rbacV2Permissions);

const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: seedPermissions.map((permission) => permission.code),
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

const documentCategories = [
  { code: "PLANOS", name: "Planos" },
  { code: "CONTRATOS", name: "Contratos" },
  { code: "ACTAS", name: "Actas" },
  { code: "SOLICITUDES_SUSPENSION", name: "Solicitudes de suspension" },
  { code: "INFORMES_TECNICOS", name: "Informes tecnicos" },
  { code: "LICENCIAS", name: "Licencias" },
  { code: "DENUNCIAS", name: "Denuncias" },
  { code: "DEMANDAS", name: "Demandas" },
  { code: "EVIDENCIAS_FOTOGRAFICAS", name: "Evidencias fotograficas" },
  { code: "PDF_OFICIAL", name: "PDF oficial" },
  { code: "OTROS", name: "Otros" },
];

const toName = (code: string) =>
  code
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");

const uatPassword = "UatDemo123!";

const uatUserDefinitions = [
  {
    email: "uat.superadmin@bitacora.local",
    fullName: "UAT Super Admin",
    roleCode: "SUPER_ADMIN",
    documentNumber: "UAT-CC-0001",
  },
  {
    email: "uat.projectmanager@bitacora.local",
    fullName: "UAT Gerente de Proyecto",
    roleCode: "PROJECT_MANAGER",
    documentNumber: "UAT-CC-0002",
  },
  {
    email: "uat.supervisor@bitacora.local",
    fullName: "UAT Supervisor de Obra",
    roleCode: "SUPERVISOR",
    documentNumber: "UAT-CC-0003",
  },
  {
    email: "uat.projectadmin@bitacora.local",
    fullName: "UAT Administrador de Proyecto",
    roleCode: "PROJECT_ADMIN",
    documentNumber: "UAT-CC-0004",
  },
  {
    email: "uat.auditor@bitacora.local",
    fullName: "UAT Auditor Tecnico",
    roleCode: "AUDITOR",
    documentNumber: "UAT-CC-0005",
  },
  {
    email: "uat.inspector@bitacora.local",
    fullName: "UAT Inspector de Campo",
    roleCode: "INSPECTOR",
    documentNumber: "UAT-CC-0006",
  },
  {
    email: "uat.viewer@bitacora.local",
    fullName: "UAT Consulta Cliente",
    roleCode: "VIEWER",
    documentNumber: "UAT-CC-0007",
  },
];

const uatProjects = [
  {
    code: "UAT-VIAL-001",
    name: "Corredor vial demo UAT",
    description:
      "Rehabilitacion de via urbana con redes de drenaje, andenes y carpeta asfaltica.",
    location: "Medellin, Antioquia",
    startDate: "2026-06-01",
    endDate: "2026-12-15",
  },
  {
    code: "UAT-EDIF-002",
    name: "Edificio institucional demo UAT",
    description:
      "Construccion de edificio de servicios con cimentacion, estructura y acabados.",
    location: "Rionegro, Antioquia",
    startDate: "2026-06-03",
    endDate: "2027-02-28",
  },
];

const uatDailyLogs = [
  {
    projectCode: "UAT-VIAL-001",
    logDate: "2026-06-01",
    status: DailyLogStatus.CLOSED,
    comments:
      "Cierre de jornada con excavacion de caja vial, conformacion de subrasante y control topografico.",
  },
  {
    projectCode: "UAT-VIAL-001",
    logDate: "2026-06-02",
    status: DailyLogStatus.APPROVED,
    comments:
      "Jornada aprobada con instalacion de tuberia pluvial y relleno compactado por capas.",
  },
  {
    projectCode: "UAT-VIAL-001",
    logDate: "2026-06-03",
    status: DailyLogStatus.IN_REVIEW,
    comments:
      "Bitacora enviada a revision por avance de concreto en cunetas y limpieza de frente.",
  },
  {
    projectCode: "UAT-VIAL-001",
    logDate: "2026-06-04",
    status: DailyLogStatus.DRAFT,
    comments:
      "Borrador de jornada con actividades preliminares de senalizacion y replanteo.",
  },
  {
    projectCode: "UAT-EDIF-002",
    logDate: "2026-06-03",
    status: DailyLogStatus.REJECTED,
    comments:
      "Bitacora rechazada por falta de soporte fotografico en actividad de acero de refuerzo.",
  },
  {
    projectCode: "UAT-EDIF-002",
    logDate: "2026-06-04",
    status: DailyLogStatus.DRAFT,
    comments:
      "Borrador de seguimiento a formaleta, acero y liberacion parcial de cimentacion.",
  },
];

const uatEventTemplates = [
  {
    eventTypeCode: "WORK_PROGRESS",
    activity: "Avance de obra civil",
    executionDescription:
      "Se ejecutaron actividades programadas con cuadrilla completa, control de calidad en sitio y registro fotografico operativo.",
  },
  {
    eventTypeCode: "MATERIAL_DELIVERY",
    activity: "Recepcion de materiales",
    executionDescription:
      "Ingreso controlado de materiales con verificacion visual, remision del proveedor y almacenamiento temporal en zona autorizada.",
  },
  {
    eventTypeCode: "INSPECTION",
    activity: "Inspeccion tecnica",
    executionDescription:
      "Revision de niveles, alineamientos y condiciones de seguridad antes de continuar con la siguiente actividad.",
  },
];

const uatDocumentDefinitions = [
  {
    projectCode: "UAT-VIAL-001",
    code: "UAT-DOC-VIAL-PLANO-001",
    title: "Plano de intervencion vial demo",
    categoryCode: "PLANOS",
    status: DocumentStatus.ACTIVE,
    visibility: DocumentVisibility.PROJECT,
  },
  {
    projectCode: "UAT-VIAL-001",
    code: "UAT-DOC-VIAL-INF-001",
    title: "Informe tecnico de compactacion demo",
    categoryCode: "INFORMES_TECNICOS",
    status: DocumentStatus.IN_REVIEW,
    visibility: DocumentVisibility.PROJECT,
  },
  {
    projectCode: "UAT-EDIF-002",
    code: "UAT-DOC-EDIF-ACTA-001",
    title: "Acta de liberacion parcial demo",
    categoryCode: "ACTAS",
    status: DocumentStatus.APPROVED,
    visibility: DocumentVisibility.ORGANIZATION,
  },
];

function dateOnly(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function dateTime(date: string, hour = 8) {
  return new Date(`${date}T${hour.toString().padStart(2, "0")}:00:00.000Z`);
}

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
    seedPermissions.map((permission) =>
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
        in: seedPermissions.map((permission) => permission.code),
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

async function seedUatDemoData() {
  console.log("Loading UAT demo data...");

  const passwordHash = await bcrypt.hash(uatPassword, 10);

  const organization = await prisma.organization.upsert({
    where: {
      nit: "900661000-1",
    },
    update: {
      name: "Constructora UAT Demo S.A.S.",
      email: "contacto.uat@bitacora.local",
      phone: "6040000000",
      status: "ACTIVE",
    },
    create: {
      nit: "900661000-1",
      name: "Constructora UAT Demo S.A.S.",
      email: "contacto.uat@bitacora.local",
      phone: "6040000000",
      status: "ACTIVE",
    },
  });

  const usersByEmail = new Map<string, { id: string; email: string }>();

  for (const userDefinition of uatUserDefinitions) {
    const user = await prisma.user.upsert({
      where: {
        email: userDefinition.email,
      },
      update: {
        fullName: userDefinition.fullName,
        phone: "3006610000",
        documentType: "CC",
        documentNumber: userDefinition.documentNumber,
        passwordHash,
        status: "ACTIVE",
        blockedReason: null,
      },
      create: {
        email: userDefinition.email,
        fullName: userDefinition.fullName,
        phone: "3006610000",
        documentType: "CC",
        documentNumber: userDefinition.documentNumber,
        passwordHash,
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
      },
    });

    usersByEmail.set(user.email, user);
  }

  const roles = await prisma.role.findMany({
    where: {
      code: {
        in: uatUserDefinitions.map((user) => user.roleCode),
      },
    },
    select: {
      id: true,
      code: true,
    },
  });
  const rolesByCode = new Map(roles.map((role) => [role.code, role]));

  for (const roleCode of uatUserDefinitions.map((user) => user.roleCode)) {
    if (!rolesByCode.has(roleCode)) {
      throw new Error(`Role not found for UAT seed: ${roleCode}`);
    }
  }

  const superAdmin = usersByEmail.get("uat.superadmin@bitacora.local");
  const inspector = usersByEmail.get("uat.inspector@bitacora.local");
  const supervisor = usersByEmail.get("uat.supervisor@bitacora.local");
  const projectAdmin = usersByEmail.get("uat.projectadmin@bitacora.local");

  if (!superAdmin || !inspector || !supervisor || !projectAdmin) {
    throw new Error("Required UAT demo users were not created.");
  }

  const projectsByCode = new Map<string, { id: string; code: string }>();

  for (const projectDefinition of uatProjects) {
    const project = await prisma.project.upsert({
      where: {
        organizationId_code: {
          organizationId: organization.id,
          code: projectDefinition.code,
        },
      },
      update: {
        name: projectDefinition.name,
        description: projectDefinition.description,
        location: projectDefinition.location,
        startDate: dateOnly(projectDefinition.startDate),
        endDate: dateOnly(projectDefinition.endDate),
        status: "ACTIVE",
        updatedById: superAdmin.id,
      },
      create: {
        organizationId: organization.id,
        code: projectDefinition.code,
        name: projectDefinition.name,
        description: projectDefinition.description,
        location: projectDefinition.location,
        startDate: dateOnly(projectDefinition.startDate),
        endDate: dateOnly(projectDefinition.endDate),
        status: "ACTIVE",
        createdById: superAdmin.id,
        updatedById: superAdmin.id,
      },
      select: {
        id: true,
        code: true,
      },
    });

    projectsByCode.set(project.code, project);
  }

  for (const project of projectsByCode.values()) {
    for (const userDefinition of uatUserDefinitions) {
      const user = usersByEmail.get(userDefinition.email);
      const role = rolesByCode.get(userDefinition.roleCode);

      if (!user || !role) {
        throw new Error(`Invalid UAT assignment for ${userDefinition.email}`);
      }

      await prisma.projectUser.upsert({
        where: {
          projectId_userId_roleId: {
            projectId: project.id,
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {
          status: "ACTIVE",
          assignedById: superAdmin.id,
        },
        create: {
          projectId: project.id,
          userId: user.id,
          roleId: role.id,
          assignedById: superAdmin.id,
        },
      });
    }
  }

  const eventTypes = await prisma.eventType.findMany({
    where: {
      code: {
        in: uatEventTemplates.map((event) => event.eventTypeCode),
      },
    },
    select: {
      id: true,
      code: true,
    },
  });
  const eventTypesByCode = new Map(
    eventTypes.map((eventType) => [eventType.code, eventType]),
  );

  for (const dailyLogDefinition of uatDailyLogs) {
    const project = projectsByCode.get(dailyLogDefinition.projectCode);

    if (!project) {
      throw new Error(
        `Project not found for UAT daily log: ${dailyLogDefinition.projectCode}`,
      );
    }

    const submittedAt =
      dailyLogDefinition.status === DailyLogStatus.DRAFT
        ? null
        : dateTime(dailyLogDefinition.logDate, 16);
    const approvedAt =
      dailyLogDefinition.status === DailyLogStatus.APPROVED ||
      dailyLogDefinition.status === DailyLogStatus.CLOSED
      ? dateTime(dailyLogDefinition.logDate, 17)
      : null;
    const closedAt =
      dailyLogDefinition.status === DailyLogStatus.CLOSED
        ? dateTime(dailyLogDefinition.logDate, 18)
        : null;

    const dailyLog = await prisma.dailyLog.upsert({
      where: {
        projectId_logDate: {
          projectId: project.id,
          logDate: dateOnly(dailyLogDefinition.logDate),
        },
      },
      update: {
        status: dailyLogDefinition.status,
        comments: dailyLogDefinition.comments,
        submittedAt,
        reviewedById:
          dailyLogDefinition.status === DailyLogStatus.DRAFT
            ? null
            : supervisor.id,
        reviewedAt: submittedAt,
        approvedById: approvedAt ? projectAdmin.id : null,
        approvedAt,
        closedAt,
        updatedById: supervisor.id,
        responsibleNameSnapshot: inspector.id ? "UAT Inspector de Campo" : null,
        approvedByNameSnapshot: approvedAt
          ? "UAT Administrador de Proyecto"
          : null,
      },
      create: {
        projectId: project.id,
        logDate: dateOnly(dailyLogDefinition.logDate),
        status: dailyLogDefinition.status,
        comments: dailyLogDefinition.comments,
        submittedAt,
        reviewedById:
          dailyLogDefinition.status === DailyLogStatus.DRAFT
            ? null
            : supervisor.id,
        reviewedAt: submittedAt,
        approvedById: approvedAt ? projectAdmin.id : null,
        approvedAt,
        closedAt,
        createdById: inspector.id,
        updatedById: supervisor.id,
        responsibleNameSnapshot: "UAT Inspector de Campo",
        approvedByNameSnapshot: approvedAt
          ? "UAT Administrador de Proyecto"
          : null,
      },
    });

    await seedUatStatusHistory(
      dailyLog.id,
      dailyLogDefinition.status,
      supervisor.id,
      dailyLogDefinition.logDate,
    );

    for (let index = 0; index < uatEventTemplates.length; index += 1) {
      const template = uatEventTemplates[index];
      const eventType = eventTypesByCode.get(template.eventTypeCode);

      if (!eventType) {
        throw new Error(`Event type not found: ${template.eventTypeCode}`);
      }

      const activity = `${template.activity} - ${dailyLogDefinition.projectCode}`;
      const existingEvent = await prisma.dailyLogEvent.findFirst({
        where: {
          dailyLogId: dailyLog.id,
          activity,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      const eventData = {
        eventTypeId: eventType.id,
        activity,
        executionDescription: template.executionDescription,
        reportedById: inspector.id,
        reportedAt: dateTime(dailyLogDefinition.logDate, 9 + index),
      };

      if (existingEvent) {
        await prisma.dailyLogEvent.update({
          where: {
            id: existingEvent.id,
          },
          data: eventData,
        });
        continue;
      }

      await prisma.dailyLogEvent.create({
        data: {
          dailyLogId: dailyLog.id,
          ...eventData,
        },
      });
    }
  }

  console.log("UAT demo data loaded.");
}

async function seedUatStatusHistory(
  dailyLogId: string,
  status: DailyLogStatus,
  changedById: string,
  logDate: string,
) {
  await prisma.dailyLogStatusHistory.deleteMany({
    where: {
      dailyLogId,
    },
  });

  const transitionsByStatus: Record<
    DailyLogStatus,
    Array<{ fromStatus: DailyLogStatus; toStatus: DailyLogStatus; hour: number }>
  > = {
    DRAFT: [],
    IN_REVIEW: [
      {
        fromStatus: DailyLogStatus.DRAFT,
        toStatus: DailyLogStatus.IN_REVIEW,
        hour: 16,
      },
    ],
    PENDING_REVIEW: [],
    OBSERVED: [],
    APPROVED: [
      {
        fromStatus: DailyLogStatus.DRAFT,
        toStatus: DailyLogStatus.IN_REVIEW,
        hour: 16,
      },
      {
        fromStatus: DailyLogStatus.IN_REVIEW,
        toStatus: DailyLogStatus.APPROVED,
        hour: 17,
      },
    ],
    REJECTED: [
      {
        fromStatus: DailyLogStatus.DRAFT,
        toStatus: DailyLogStatus.IN_REVIEW,
        hour: 16,
      },
      {
        fromStatus: DailyLogStatus.IN_REVIEW,
        toStatus: DailyLogStatus.REJECTED,
        hour: 17,
      },
    ],
    PDF_GENERATED: [],
    SIGNED: [],
    CLOSED: [
      {
        fromStatus: DailyLogStatus.DRAFT,
        toStatus: DailyLogStatus.IN_REVIEW,
        hour: 16,
      },
      {
        fromStatus: DailyLogStatus.IN_REVIEW,
        toStatus: DailyLogStatus.APPROVED,
        hour: 17,
      },
      {
        fromStatus: DailyLogStatus.APPROVED,
        toStatus: DailyLogStatus.CLOSED,
        hour: 18,
      },
    ],
    VOIDED: [],
  };

  const transitions = transitionsByStatus[status];

  if (transitions.length === 0) {
    return;
  }

  await prisma.dailyLogStatusHistory.createMany({
    data: transitions.map((transition) => ({
      dailyLogId,
      changedById,
      fromStatus: transition.fromStatus,
      toStatus: transition.toStatus,
      comments: `Transicion demo UAT a ${transition.toStatus}`,
      changedAt: dateTime(logDate, transition.hour),
    })),
  });
}

async function seedUatDemoDocuments() {
  console.log("Loading UAT demo documents...");

  const organization = await prisma.organization.findUnique({
    where: {
      nit: "900661000-1",
    },
    select: {
      id: true,
    },
  });
  const uploadedBy = await prisma.user.findUnique({
    where: {
      email: "uat.projectadmin@bitacora.local",
    },
    select: {
      id: true,
    },
  });
  const documentTypeCatalog = await prisma.documentTypeCatalog.findUnique({
    where: {
      code: "OTHER",
    },
    select: {
      id: true,
    },
  });

  if (!organization || !uploadedBy || !documentTypeCatalog) {
    throw new Error("Required UAT document seed dependencies were not found.");
  }

  for (const documentDefinition of uatDocumentDefinitions) {
    const project = await prisma.project.findFirst({
      where: {
        organizationId: organization.id,
        code: documentDefinition.projectCode,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      throw new Error(
        `Project not found for UAT document: ${documentDefinition.projectCode}`,
      );
    }

    const category = await prisma.documentCategory.findFirst({
      where: {
        organizationId: organization.id,
        projectId: null,
        code: documentDefinition.categoryCode,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new Error(
        `Document category not found for UAT seed: ${documentDefinition.categoryCode}`,
      );
    }

    await prisma.document.upsert({
      where: {
        projectId_code: {
          projectId: project.id,
          code: documentDefinition.code,
        },
      },
      update: {
        categoryId: category.id,
        title: documentDefinition.title,
        description:
          "Documento metadata-only para demostracion UAT. No contiene binario fisico.",
        fileName: `${documentDefinition.code}.pending`,
        storagePath: `pending://${documentDefinition.code}.pending`,
        status: documentDefinition.status,
        visibility: documentDefinition.visibility,
        updatedById: uploadedBy.id,
        deletedAt: null,
        deletedById: null,
      },
      create: {
        organizationId: organization.id,
        projectId: project.id,
        documentTypeId: documentTypeCatalog.id,
        categoryId: category.id,
        uploadedById: uploadedBy.id,
        createdById: uploadedBy.id,
        updatedById: uploadedBy.id,
        code: documentDefinition.code,
        type: DocumentType.OTRO,
        title: documentDefinition.title,
        description:
          "Documento metadata-only para demostracion UAT. No contiene binario fisico.",
        fileName: `${documentDefinition.code}.pending`,
        storagePath: `pending://${documentDefinition.code}.pending`,
        status: documentDefinition.status,
        visibility: documentDefinition.visibility,
        metadata: {
          seed: "FASE_66_1_UAT",
          binary: false,
        },
      },
    });
  }

  console.log("UAT demo documents loaded.");
}

async function seedDocumentCategories() {
  console.log("Loading document categories...");

  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
    },
  });

  for (const organization of organizations) {
    for (const category of documentCategories) {
      const existingCategory = await prisma.documentCategory.findFirst({
        where: {
          organizationId: organization.id,
          projectId: null,
          code: category.code,
        },
        select: {
          id: true,
        },
      });

      if (existingCategory) {
        await prisma.documentCategory.update({
          where: {
            id: existingCategory.id,
          },
          data: {
            name: category.name,
            status: "ACTIVE",
          },
        });
        continue;
      }

      await prisma.documentCategory.create({
        data: {
          organizationId: organization.id,
          code: category.code,
          name: category.name,
        },
      });
    }
  }

  console.log("Document categories loaded.");
}

async function main() {
  console.log("Starting seed...");

  await seedBaseCatalogs();
  await seedDemoData();
  await seedUatDemoData();
  await seedDocumentCategories();
  await seedUatDemoDocuments();

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
