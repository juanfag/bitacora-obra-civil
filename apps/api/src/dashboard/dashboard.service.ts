import { Injectable } from "@nestjs/common";
import {
  DailyLogStatus,
  Prisma,
  ProjectStatus,
  RecordStatus,
} from "@prisma/client";
import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessPolicy } from "../projects/project-access.policy";
import { DashboardMetricsResponseDto } from "./dto/dashboard-metrics-response.dto";
import {
  DashboardRecentActivityItemDto,
  DashboardRecentActivityResponseDto,
} from "./dto/dashboard-recent-activity-response.dto";

const OPEN_DAILY_LOG_STATUSES = [
  DailyLogStatus.DRAFT,
  DailyLogStatus.IN_REVIEW,
  DailyLogStatus.PENDING_REVIEW,
  DailyLogStatus.OBSERVED,
  DailyLogStatus.APPROVED,
  DailyLogStatus.REJECTED,
  DailyLogStatus.PDF_GENERATED,
  DailyLogStatus.SIGNED,
] satisfies DailyLogStatus[];

const PENDING_APPROVAL_STATUSES = [
  DailyLogStatus.IN_REVIEW,
  DailyLogStatus.PENDING_REVIEW,
] satisfies DailyLogStatus[];

const DEFAULT_RECENT_ACTIVITY_LIMIT = 20;
const MAX_RECENT_ACTIVITY_LIMIT = 50;
const RELEVANT_STATUS_CHANGES = [
  DailyLogStatus.APPROVED,
  DailyLogStatus.REJECTED,
  DailyLogStatus.CLOSED,
] satisfies DailyLogStatus[];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessPolicy: ProjectAccessPolicy,
  ) {}

  async getMetrics(
    user: CurrentUserPayload,
  ): Promise<DashboardMetricsResponseDto> {
    const accessibleProjectIds =
      await this.projectAccessPolicy.getAccessibleProjectIds(user.sub);
    const projectScope = buildProjectScope(accessibleProjectIds);
    const dailyLogScope = buildDailyLogScope(accessibleProjectIds);

    if (accessibleProjectIds && accessibleProjectIds.length === 0) {
      return {
        activeProjects: 0,
        closedDailyLogs: 0,
        openDailyLogs: 0,
        pendingApprovalDailyLogs: 0,
        totalActiveUsers: 0,
        totalEvents: 0,
      };
    }

    const [
      activeProjects,
      openDailyLogs,
      pendingApprovalDailyLogs,
      closedDailyLogs,
      totalEvents,
      activeProjectUsers,
    ] = await this.prisma.$transaction([
      this.prisma.project.count({
        where: {
          ...projectScope,
          status: ProjectStatus.ACTIVE,
        },
      }),
      this.prisma.dailyLog.count({
        where: {
          ...dailyLogScope,
          status: {
            in: OPEN_DAILY_LOG_STATUSES,
          },
        },
      }),
      this.prisma.dailyLog.count({
        where: {
          ...dailyLogScope,
          status: {
            in: PENDING_APPROVAL_STATUSES,
          },
        },
      }),
      this.prisma.dailyLog.count({
        where: {
          ...dailyLogScope,
          status: DailyLogStatus.CLOSED,
        },
      }),
      this.prisma.dailyLogEvent.count({
        where: {
          deletedAt: null,
          dailyLog: dailyLogScope,
        },
      }),
      this.prisma.projectUser.findMany({
        where: {
          ...buildProjectUserScope(accessibleProjectIds),
          status: RecordStatus.ACTIVE,
          user: {
            status: RecordStatus.ACTIVE,
          },
        },
        distinct: ["userId"],
        select: {
          userId: true,
        },
      }),
    ]);

    return {
      activeProjects,
      closedDailyLogs,
      openDailyLogs,
      pendingApprovalDailyLogs,
      totalActiveUsers: activeProjectUsers.length,
      totalEvents,
    };
  }

  async getRecentActivity(
    user: CurrentUserPayload,
    requestedLimit?: string,
  ): Promise<DashboardRecentActivityResponseDto> {
    const accessibleProjectIds =
      await this.projectAccessPolicy.getAccessibleProjectIds(user.sub);
    const limit = parseRecentActivityLimit(requestedLimit);

    if (accessibleProjectIds && accessibleProjectIds.length === 0) {
      return {
        items: [],
        limit,
      };
    }

    const dailyLogScope = buildDailyLogScope(accessibleProjectIds);
    const [
      dailyLogs,
      statusChanges,
      pdfVersions,
      signatures,
      events,
    ] = await this.prisma.$transaction([
      this.prisma.dailyLog.findMany({
        where: dailyLogScope,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
      }),
      this.prisma.dailyLogStatusHistory.findMany({
        where: {
          toStatus: {
            in: RELEVANT_STATUS_CHANGES,
          },
          dailyLog: dailyLogScope,
        },
        include: {
          dailyLog: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          changedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          changedAt: "desc",
        },
        take: limit,
      }),
      this.prisma.dailyLogPdfVersion.findMany({
        where: {
          dailyLog: dailyLogScope,
        },
        include: {
          dailyLog: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          generatedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          generatedAt: "desc",
        },
        take: limit,
      }),
      this.prisma.dailyLogSignature.findMany({
        where: {
          dailyLog: dailyLogScope,
        },
        include: {
          dailyLog: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          signerUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          signedAt: "desc",
        },
        take: limit,
      }),
      this.prisma.dailyLogEvent.findMany({
        where: {
          deletedAt: null,
          dailyLog: dailyLogScope,
        },
        include: {
          dailyLog: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          reportedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          reportedAt: "desc",
        },
        take: limit,
      }),
    ]);

    const items = [
      ...dailyLogs.map(toDailyLogCreatedActivityItem),
      ...statusChanges.map(toStatusChangeActivityItem),
      ...pdfVersions.map(toPdfGeneratedActivityItem),
      ...signatures.map(toSignatureActivityItem),
      ...events.map(toEventActivityItem),
    ]
      .sort(
        (first, second) =>
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime(),
      )
      .slice(0, limit);

    return {
      items,
      limit,
    };
  }
}

function buildProjectScope(
  accessibleProjectIds: string[] | null,
): Prisma.ProjectWhereInput {
  if (!accessibleProjectIds) {
    return {};
  }

  return {
    id: {
      in: accessibleProjectIds,
    },
  };
}

function buildDailyLogScope(
  accessibleProjectIds: string[] | null,
): Prisma.DailyLogWhereInput {
  if (!accessibleProjectIds) {
    return {};
  }

  return {
    projectId: {
      in: accessibleProjectIds,
    },
  };
}

function buildProjectUserScope(
  accessibleProjectIds: string[] | null,
): Prisma.ProjectUserWhereInput {
  if (!accessibleProjectIds) {
    return {};
  }

  return {
    projectId: {
      in: accessibleProjectIds,
    },
  };
}

function parseRecentActivityLimit(requestedLimit?: string): number {
  const parsedLimit = Number(requestedLimit);

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    return DEFAULT_RECENT_ACTIVITY_LIMIT;
  }

  return Math.min(parsedLimit, MAX_RECENT_ACTIVITY_LIMIT);
}

type DashboardProjectRef = {
  id: string;
  name: string;
};

type DashboardUserRef = {
  id: string;
  fullName: string | null;
  email: string | null;
};

type DashboardDailyLogRef = {
  id: string;
  logDate: Date;
  projectId: string;
  project: DashboardProjectRef;
};

function toDailyLogCreatedActivityItem(dailyLog: DashboardDailyLogRef & {
  comments: string | null;
  createdAt: Date;
  createdById: string;
  createdBy: DashboardUserRef;
}): DashboardRecentActivityItemDto {
  return {
    id: dailyLog.id,
    type: "DAILY_LOG_CREATED",
    title: "Bitacora creada",
    description:
      truncateText(dailyLog.comments) ?? dailyLogDescription(dailyLog.logDate),
    projectId: dailyLog.projectId,
    projectName: dailyLog.project.name,
    userId: dailyLog.createdById,
    userName: userDisplayName(dailyLog.createdBy),
    createdAt: dailyLog.createdAt.toISOString(),
  };
}

function toStatusChangeActivityItem(statusChange: {
  id: string;
  toStatus: DailyLogStatus;
  comments: string | null;
  changedById: string;
  changedAt: Date;
  dailyLog: DashboardDailyLogRef;
  changedBy: DashboardUserRef;
}): DashboardRecentActivityItemDto {
  const statusCopy = getStatusActivityCopy(statusChange.toStatus);

  return {
    id: statusChange.id,
    type: statusCopy.type,
    title: statusCopy.title,
    description:
      truncateText(statusChange.comments) ??
      dailyLogDescription(statusChange.dailyLog.logDate),
    projectId: statusChange.dailyLog.projectId,
    projectName: statusChange.dailyLog.project.name,
    userId: statusChange.changedById,
    userName: userDisplayName(statusChange.changedBy),
    createdAt: statusChange.changedAt.toISOString(),
  };
}

function toPdfGeneratedActivityItem(pdfVersion: {
  id: string;
  versionNumber: number;
  generatedById: string;
  generatedAt: Date;
  dailyLog: DashboardDailyLogRef;
  generatedBy: DashboardUserRef;
}): DashboardRecentActivityItemDto {
  return {
    id: pdfVersion.id,
    type: "DAILY_LOG_PDF_GENERATED",
    title: "PDF generado",
    description: `${dailyLogDescription(pdfVersion.dailyLog.logDate)} - version ${pdfVersion.versionNumber}`,
    projectId: pdfVersion.dailyLog.projectId,
    projectName: pdfVersion.dailyLog.project.name,
    userId: pdfVersion.generatedById,
    userName: userDisplayName(pdfVersion.generatedBy),
    createdAt: pdfVersion.generatedAt.toISOString(),
  };
}

function toSignatureActivityItem(signature: {
  id: string;
  signerUserId: string;
  signerName: string;
  signatureType: string;
  signedAt: Date;
  dailyLog: DashboardDailyLogRef;
  signerUser: DashboardUserRef;
}): DashboardRecentActivityItemDto {
  return {
    id: signature.id,
    type: "DAILY_LOG_SIGNATURE_APPLIED",
    title: "Firma aplicada",
    description: `${formatSignatureType(signature.signatureType)} - ${dailyLogDescription(signature.dailyLog.logDate)}`,
    projectId: signature.dailyLog.projectId,
    projectName: signature.dailyLog.project.name,
    userId: signature.signerUserId,
    userName: signature.signerName || userDisplayName(signature.signerUser),
    createdAt: signature.signedAt.toISOString(),
  };
}

function toEventActivityItem(event: {
  id: string;
  activity: string;
  executionDescription: string;
  reportedById: string;
  reportedAt: Date;
  dailyLog: DashboardDailyLogRef;
  reportedBy: DashboardUserRef;
}): DashboardRecentActivityItemDto {
  return {
    id: event.id,
    type: "DAILY_LOG_EVENT_REPORTED",
    title: "Evento registrado",
    description:
      truncateText(event.activity) ??
      truncateText(event.executionDescription) ??
      dailyLogDescription(event.dailyLog.logDate),
    projectId: event.dailyLog.projectId,
    projectName: event.dailyLog.project.name,
    userId: event.reportedById,
    userName: userDisplayName(event.reportedBy),
    createdAt: event.reportedAt.toISOString(),
  };
}

function getStatusActivityCopy(status: DailyLogStatus): {
  type: string;
  title: string;
} {
  if (status === DailyLogStatus.APPROVED) {
    return {
      type: "DAILY_LOG_APPROVED",
      title: "Bitacora aprobada",
    };
  }

  if (status === DailyLogStatus.REJECTED) {
    return {
      type: "DAILY_LOG_REJECTED",
      title: "Bitacora rechazada",
    };
  }

  return {
    type: "DAILY_LOG_CLOSED",
    title: "Bitacora cerrada",
  };
}

function dailyLogDescription(logDate: Date): string {
  return `Bitacora del ${formatDateOnly(logDate)}`;
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function truncateText(value: string | null | undefined, maxLength = 140) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.length <= maxLength) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, maxLength - 1)}...`;
}

function userDisplayName(user: DashboardUserRef | null | undefined) {
  return user?.fullName?.trim() || user?.email?.trim() || null;
}

function formatSignatureType(signatureType: string): string {
  if (signatureType === "RESPONSIBLE") {
    return "Responsable";
  }

  if (signatureType === "APPROVER") {
    return "Aprobador";
  }

  if (signatureType === "INSPECTOR") {
    return "Inspector";
  }

  return "Firma";
}
