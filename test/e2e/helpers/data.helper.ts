import { PrismaService } from "../../../apps/api/src/prisma/prisma.service";

export async function getDemoProjectId(prisma: PrismaService) {
  const project = await prisma.project.findFirst({
    where: {
      code: "PROY-DEMO-001",
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    throw new Error("Demo project PROY-DEMO-001 was not found. Run prisma seed first.");
  }

  return project.id;
}

export async function getSmokeEventTypeId(prisma: PrismaService) {
  const eventType = await prisma.eventType.findFirst({
    where: {
      code: "WORK_PROGRESS",
    },
    select: {
      id: true,
    },
  });

  if (!eventType) {
    throw new Error("Event type WORK_PROGRESS was not found. Run prisma seed first.");
  }

  return eventType.id;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const BASE_FUTURE_DATE_UTC = Date.UTC(2099, 0, 1);
let uniqueDateCounter = 0;

export function uniqueFutureDate(seed: string) {
  const seedOffset = Math.abs(hashCode(seed)) % 5000;
  const date = new Date(
    BASE_FUTURE_DATE_UTC + (seedOffset + uniqueDateCounter) * DAY_IN_MS,
  );

  uniqueDateCounter += 1;

  return date.toISOString().split("T")[0];
}

function hashCode(value: string) {
  return value.split("").reduce((hash, char) => {
    return (hash << 5) - hash + char.charCodeAt(0);
  }, 0);
}
