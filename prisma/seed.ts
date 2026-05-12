import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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
  await upsertByCode(prisma.role, roles);
  await upsertByCode(prisma.permission, permissions);
  await upsertByCode(prisma.eventType, eventTypes);
  await upsertByCode(prisma.documentType, documentTypes);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
