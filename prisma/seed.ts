import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const toName = (code: string) =>
  code
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");

const roles = [
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "PROJECT_ADMIN",
  "DIRECTOR",
  "RESIDENT_ENGINEER",
  "INSPECTOR",
  "CONTRACTOR",
  "AUDITOR",
  "VIEWER",
];

const permissions = [
  "PROJECT_CREATE",
  "PROJECT_UPDATE",
  "PROJECT_VIEW",
  "USER_INVITE",
  "USER_ASSIGN_ROLE",
  "EVENT_CREATE",
  "EVENT_UPDATE_OWN",
  "EVENT_UPDATE_ANY",
  "EVENT_VIEW",
  "EVENT_APPROVE",
  "EVENT_REJECT",
  "DOCUMENT_UPLOAD",
  "DOCUMENT_VIEW",
  "DOCUMENT_DELETE",
  "DAILY_LOG_VIEW",
  "DAILY_LOG_SUBMIT",
  "DAILY_LOG_APPROVE",
  "DAILY_LOG_REJECT",
  "DAILY_LOG_CLOSE",
  "PDF_GENERATE",
  "PDF_SIGN",
  "AUDIT_VIEW",
];

const eventTypes = [
  "WORK_PROGRESS",
  "ACTIVITY_EXECUTION",
  "INCIDENT",
  "ACCIDENT",
  "WEATHER_CONDITION",
  "MATERIAL_DELIVERY",
  "EQUIPMENT_ENTRY",
  "EQUIPMENT_EXIT",
  "TECHNICAL_INSTRUCTION",
  "SUSPENSION_REQUEST",
  "WORK_SUSPENSION",
  "WORK_RESUMPTION",
  "SITE_VISIT",
  "LEGAL_CLAIM",
  "COMPLAINT",
  "OTHER",
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

async function upsertByCode(
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

async function main() {
  console.log("🌱 Iniciando seed...");

  // =========================
  // Catálogos base
  // =========================

  await upsertByCode(prisma.role, roles);
  await upsertByCode(prisma.permission, permissions);
  await upsertByCode(prisma.eventType, eventTypes);
  await upsertByCode(prisma.documentType, documentTypes);

  console.log("✅ Catálogos cargados");

  // =========================
  // Organización demo
  // =========================

  const organization = await prisma.organization.upsert({
  where: {
    nit: "900000000-1",
  },
  update: {
    name: "Organización Demo",
  },
  create: {
    nit: "900000000-1",
    name: "Organización Demo",
    email: "demo@bitacora.local",
    phone: "3000000000",
  },
});

  console.log("✅ Organización demo creada");

  // =========================
  // Password admin
  // =========================

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // =========================
  // Usuario admin demo
  // =========================

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

  console.log("✅ Usuario admin creado");

  // =========================
  // Rol SUPER_ADMIN
  // =========================

  const superAdminRole = await prisma.role.findUnique({
    where: {
      code: "SUPER_ADMIN",
    },
  });

  if (!superAdminRole) {
    throw new Error("❌ No se encontró el rol SUPER_ADMIN");
  }

  // =========================
  // Relación usuario-rol
  // =========================

 const project = await prisma.project.upsert({
  where: {
    organizationId_code: {
      organizationId: organization.id,
      code: "PROY-DEMO-001",
    },
  },
  update: {
    name: "Proyecto Demo Bitácora de Obra",
  },
  create: {
    organizationId: organization.id,
    code: "PROY-DEMO-001",
    name: "Proyecto Demo Bitácora de Obra",
    description: "Proyecto inicial para pruebas de la plataforma",
    location: "Medellín, Colombia",
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
  },
  create: {
    projectId: project.id,
    userId: adminUser.id,
    roleId: superAdminRole.id,
    assignedById: adminUser.id,
  },
});

console.log("✅ Proyecto demo creado");
console.log("✅ Usuario admin asignado al proyecto con rol SUPER_ADMIN");

  console.log("✅ Rol SUPER_ADMIN asignado");

  console.log("🎉 Seed finalizado correctamente");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("❌ Error ejecutando seed:");
    console.error(error);

    await prisma.$disconnect();
    process.exit(1);
  });