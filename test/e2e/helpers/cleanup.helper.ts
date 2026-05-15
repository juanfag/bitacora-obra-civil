import { PrismaService } from "../../../apps/api/src/prisma/prisma.service";

export async function cleanupDailyLogGraph(
  prisma: PrismaService,
  dailyLogIds: string[],
) {
  if (!dailyLogIds.length) {
    return;
  }

  const events = await prisma.dailyLogEvent.findMany({
    where: {
      dailyLogId: {
        in: dailyLogIds,
      },
    },
    select: {
      id: true,
    },
  });
  const eventIds = events.map((event) => event.id);

  if (eventIds.length) {
    await prisma.attachment.deleteMany({
      where: {
        dailyLogEventId: {
          in: eventIds,
        },
      },
    });
    await prisma.dailyLogEvent.deleteMany({
      where: {
        id: {
          in: eventIds,
        },
      },
    });
  }

  await prisma.dailyLogStatusHistory.deleteMany({
    where: {
      dailyLogId: {
        in: dailyLogIds,
      },
    },
  });
  await prisma.dailyLogApproval.deleteMany({
    where: {
      dailyLogId: {
        in: dailyLogIds,
      },
    },
  });
  await prisma.auditLog.deleteMany({
    where: {
      entityName: "DailyLog",
      entityId: {
        in: dailyLogIds,
      },
    },
  });
  await prisma.dailyLog.deleteMany({
    where: {
      id: {
        in: dailyLogIds,
      },
    },
  });
}
