import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DailyLog, DailyLogStatus, Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AuditRequestContext } from "../audit/audit.types";
import { PrismaService } from "../prisma/prisma.service";
import { DailyLogWorkflowService } from "./daily-log-workflow.service";
import { isEditableStatus } from "./daily-log-status.helper";
import { CreateDailyLogDto } from "./dto/create-daily-log.dto";
import { FindDailyLogsQueryDto } from "./dto/find-daily-logs-query.dto";
import { RejectDailyLogDto } from "./dto/reject-daily-log.dto";
import { UpdateDailyLogDto } from "./dto/update-daily-log.dto";

@Injectable()
export class DailyLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly workflowService: DailyLogWorkflowService,
  ) {}

  async findAll(query: FindDailyLogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.DailyLogWhereInput = {
      projectId: query.projectId,
      logDate: query.logDate ? this.toDate(query.logDate) : undefined,
      status: query.status ?? {
        not: DailyLogStatus.VOIDED,
      },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.dailyLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          logDate: "desc",
        },
      }),
      this.prisma.dailyLog.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByProject(projectId: string, query: FindDailyLogsQueryDto) {
    await this.ensureProjectExists(projectId);

    return this.findAll({
      ...query,
      projectId,
    });
  }

  async findOne(id: string) {
    const dailyLog = await this.prisma.dailyLog.findFirst({
      where: {
        id,
        status: {
          not: DailyLogStatus.VOIDED,
        },
      },
    });

    if (!dailyLog) {
      throw new NotFoundException("Daily log not found");
    }

    return dailyLog;
  }

  async create(
    createDailyLogDto: CreateDailyLogDto,
    audit: AuditRequestContext,
  ) {
    await this.ensureProjectExists(createDailyLogDto.projectId);
    const logDate = this.toDate(createDailyLogDto.logDate);
    const existingDailyLog = await this.findDailyLogByProjectAndDate(
      createDailyLogDto.projectId,
      logDate,
    );

    if (existingDailyLog && existingDailyLog.status !== DailyLogStatus.VOIDED) {
      throw new ConflictException(
        "A daily log already exists for this project and date.",
      );
    }

    await this.ensurePreviousRequiredWorkDayIsClosed(
      createDailyLogDto.projectId,
      logDate,
    );

    if (existingDailyLog) {
      return this.restoreVoidedDailyLog(
        existingDailyLog.id,
        createDailyLogDto.comments,
        audit,
      );
    }

    try {
      const dailyLog = await this.prisma.dailyLog.create({
        data: {
          projectId: createDailyLogDto.projectId,
          logDate,
          // TODO: Keep DRAFT hardening until official workflow states are migrated.
          status: DailyLogStatus.DRAFT,
          comments: createDailyLogDto.comments,
          createdById: audit.actorId,
        },
      });

      await this.auditService.record({
        ...audit,
        action: "CREATE",
        entity: "DailyLog",
        entityId: dailyLog.id,
      });

      return dailyLog;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    updateDailyLogDto: UpdateDailyLogDto,
    audit: AuditRequestContext,
  ) {
    const currentDailyLog = await this.findOne(id);
    this.ensureDailyLogCanBeEdited(currentDailyLog);

    if (updateDailyLogDto.projectId) {
      await this.ensureProjectExists(updateDailyLogDto.projectId);
    }

    try {
      const dailyLog = await this.prisma.dailyLog.update({
        where: { id },
        data: {
          projectId: updateDailyLogDto.projectId,
          logDate: updateDailyLogDto.logDate
            ? this.toDate(updateDailyLogDto.logDate)
            : undefined,
          comments: updateDailyLogDto.comments,
          updatedById: audit.actorId,
        },
      });

      await this.auditService.record({
        ...audit,
        action: "UPDATE",
        entity: "DailyLog",
        entityId: dailyLog.id,
      });

      return dailyLog;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string, audit: AuditRequestContext) {
    return this.workflowService.void(id, audit);
  }

  async cancel(id: string, audit: AuditRequestContext) {
    return this.workflowService.void(id, audit);
  }

  async submitForReview(id: string, audit: AuditRequestContext) {
    return this.workflowService.submitForReview(id, audit);
  }

  async approve(id: string, audit: AuditRequestContext) {
    return this.workflowService.approve(id, audit);
  }

  async reject(
    id: string,
    rejectDailyLogDto: RejectDailyLogDto,
    audit: AuditRequestContext,
  ) {
    return this.workflowService.reject(id, rejectDailyLogDto, audit);
  }

  async close(id: string, audit: AuditRequestContext) {
    return this.workflowService.close(id, audit);
  }

  async returnToDraft(id: string, audit: AuditRequestContext) {
    return this.workflowService.returnToDraft(id, audit);
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new BadRequestException("Invalid projectId reference");
    }
  }

  private toDate(value: string) {
    const dateOnly = value.slice(0, 10);
    const [year, month, day] = dateOnly.split("-").map(Number);

    if (!year || !month || !day) {
      return new Date(value);
    }

    return new Date(Date.UTC(year, month - 1, day));
  }

  private async ensurePreviousRequiredWorkDayIsClosed(
    projectId: string,
    logDate: Date,
  ) {
    const previousRequiredWorkDay = this.getPreviousRequiredWorkDay(logDate);
    const previousDailyLog = await this.prisma.dailyLog.findFirst({
      where: {
        projectId,
        logDate: previousRequiredWorkDay,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (previousDailyLog) {
      if (previousDailyLog.status !== DailyLogStatus.CLOSED) {
        throw new ConflictException(
          "Previous required work day daily log must be CLOSED before creating a new daily log.",
        );
      }

      return;
    }

    const projectDailyLogsCount = await this.prisma.dailyLog.count({
      where: {
        projectId,
      },
    });

    if (projectDailyLogsCount > 0) {
      throw new ConflictException(
        "Previous required work day daily log must exist and be CLOSED before creating a new daily log.",
      );
    }
  }

  private async findDailyLogByProjectAndDate(projectId: string, logDate: Date) {
    return this.prisma.dailyLog.findFirst({
      where: {
        projectId,
        logDate,
      },
      select: {
        id: true,
        status: true,
      },
    });
  }

  private async restoreVoidedDailyLog(
    id: string,
    comments: string | undefined,
    audit: AuditRequestContext,
  ) {
    const dailyLog = await this.prisma.$transaction(async (tx) => {
      const restoredDailyLog = await tx.dailyLog.update({
        where: { id },
        data: {
          status: DailyLogStatus.DRAFT,
          comments,
          submittedAt: null,
          reviewedById: null,
          reviewedAt: null,
          approvedById: null,
          approvedAt: null,
          closedAt: null,
          deletedById: null,
          updatedById: audit.actorId,
        },
      });

      await tx.dailyLogStatusHistory.create({
        data: {
          dailyLogId: id,
          fromStatus: DailyLogStatus.VOIDED,
          toStatus: DailyLogStatus.DRAFT,
          changedById: audit.actorId,
          comments: "Restored by daily log creation for the same project and date.",
        },
      });

      return restoredDailyLog;
    });

    await this.auditService.record({
      ...audit,
      action: "CREATE",
      entity: "DailyLog",
      entityId: dailyLog.id,
      oldValue: {
        status: DailyLogStatus.VOIDED,
      },
      newValue: {
        status: DailyLogStatus.DRAFT,
        restoredFromVoided: true,
      },
    });

    return dailyLog;
  }

  private getPreviousRequiredWorkDay(logDate: Date) {
    const previousDate = new Date(logDate);
    previousDate.setUTCDate(previousDate.getUTCDate() - 1);

    while (previousDate.getUTCDay() === 0) {
      previousDate.setUTCDate(previousDate.getUTCDate() - 1);
    }

    return previousDate;
  }

  private ensureDailyLogCanBeEdited(dailyLog: DailyLog) {
    if (!isEditableStatus(dailyLog.status)) {
      throw new ConflictException(
        "Daily log can only be edited while it is DRAFT.",
      );
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ConflictException(
          "A daily log already exists for this project and date.",
        );
      }

      if (error.code === "P2003") {
        throw new BadRequestException("Invalid projectId or createdBy reference");
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Daily log not found");
      }
    }

    throw error;
  }
}
