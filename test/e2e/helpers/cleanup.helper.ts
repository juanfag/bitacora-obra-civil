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
    await prisma.documentRelation.deleteMany({
      where: {
        dailyLogEventId: {
          in: eventIds,
        },
      },
    });
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
  await prisma.documentRelation.deleteMany({
    where: {
      dailyLogId: {
        in: dailyLogIds,
      },
    },
  });
  await prisma.dailyLogDocument.deleteMany({
    where: {
      dailyLogId: {
        in: dailyLogIds,
      },
    },
  });
  await prisma.dailyLogPdfVersion.deleteMany({
    where: {
      dailyLogId: {
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

export async function cleanupSmokeProjects(
  prisma: PrismaService,
  projectIds: string[],
) {
  if (!projectIds.length) {
    return;
  }

  const dailyLogs = await prisma.dailyLog.findMany({
    where: {
      projectId: {
        in: projectIds,
      },
    },
    select: {
      id: true,
    },
  });
  await cleanupDailyLogGraph(
    prisma,
    dailyLogs.map((dailyLog) => dailyLog.id),
  );

  const documents = await prisma.document.findMany({
    where: {
      projectId: {
        in: projectIds,
      },
    },
    select: {
      id: true,
    },
  });
  const documentIds = documents.map((document) => document.id);

  if (documentIds.length) {
    await prisma.documentRelation.deleteMany({
      where: {
        documentId: {
          in: documentIds,
        },
      },
    });
    await prisma.eventDocument.deleteMany({
      where: {
        documentId: {
          in: documentIds,
        },
      },
    });
    await prisma.dailyLogDocument.deleteMany({
      where: {
        documentId: {
          in: documentIds,
        },
      },
    });
    await prisma.dailyLogPdfVersion.deleteMany({
      where: {
        documentId: {
          in: documentIds,
        },
      },
    });
    await prisma.document.updateMany({
      where: {
        id: {
          in: documentIds,
        },
      },
      data: {
        currentVersionId: null,
      },
    });
    await prisma.documentVersion.deleteMany({
      where: {
        documentId: {
          in: documentIds,
        },
      },
    });
    await prisma.document.deleteMany({
      where: {
        id: {
          in: documentIds,
        },
      },
    });
  }

  await prisma.projectUser.deleteMany({
    where: {
      projectId: {
        in: projectIds,
      },
    },
  });
  await prisma.auditLog.deleteMany({
    where: {
      entityName: "Project",
      entityId: {
        in: projectIds,
      },
    },
  });
  await prisma.project.deleteMany({
    where: {
      id: {
        in: projectIds,
      },
    },
  });
}
