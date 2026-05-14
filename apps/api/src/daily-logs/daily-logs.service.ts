import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ApprovalAction, DailyLog, DailyLogStatus, Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AuditRequestContext } from "../audit/audit.types";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDailyLogDto } from "./dto/create-daily-log.dto";
import { FindDailyLogsQueryDto } from "./dto/find-daily-logs-query.dto";
import { RejectDailyLogDto } from "./dto/reject-daily-log.dto";
import { UpdateDailyLogDto } from "./dto/update-daily-log.dto";

@Injectable()
export class DailyLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
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

    try {
      const dailyLog = await this.prisma.dailyLog.create({
        data: {
          projectId: createDailyLogDto.projectId,
          logDate: this.toDate(createDailyLogDto.logDate),
          status: createDailyLogDto.status,
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
    const currentDailyLog = await this.findOne(id);
    const dailyLog = await this.prisma.$transaction(async (tx) => {
      const updatedDailyLog = await tx.dailyLog.update({
        where: { id },
        data: {
          status: DailyLogStatus.VOIDED,
          deletedById: audit.actorId,
        },
      });

      await this.recordStatusHistory(tx, {
        dailyLogId: id,
        fromStatus: currentDailyLog.status,
        toStatus: DailyLogStatus.VOIDED,
        changedById: audit.actorId,
      });

      return updatedDailyLog;
    });

    await this.auditService.record({
      ...audit,
      action: "DELETE",
      entity: "DailyLog",
      entityId: dailyLog.id,
    });

    return dailyLog;
  }

  async submitForReview(id: string, audit: AuditRequestContext) {
    const currentDailyLog = await this.findOne(id);
    this.ensureTransitionAllowed(currentDailyLog, [
      DailyLogStatus.DRAFT,
      DailyLogStatus.REJECTED,
    ]);

    const dailyLog = await this.prisma.$transaction(async (tx) => {
      const updatedDailyLog = await tx.dailyLog.update({
        where: { id },
        data: {
          status: DailyLogStatus.IN_REVIEW,
          submittedAt: new Date(),
          reviewedById: null,
          reviewedAt: null,
          approvedById: null,
          approvedAt: null,
          closedAt: null,
          updatedById: audit.actorId,
        },
      });

      await this.recordStatusHistory(tx, {
        dailyLogId: id,
        fromStatus: currentDailyLog.status,
        toStatus: DailyLogStatus.IN_REVIEW,
        changedById: audit.actorId,
      });

      return updatedDailyLog;
    });

    await this.auditService.record({
      ...audit,
      action: "SUBMIT",
      entity: "DailyLog",
      entityId: dailyLog.id,
    });

    return dailyLog;
  }

  async approve(id: string, audit: AuditRequestContext) {
    const currentDailyLog = await this.findOne(id);
    this.ensureTransitionAllowed(currentDailyLog, [DailyLogStatus.IN_REVIEW]);

    const now = new Date();
    const dailyLog = await this.prisma.$transaction(async (tx) => {
      const updatedDailyLog = await tx.dailyLog.update({
        where: { id },
        data: {
          status: DailyLogStatus.APPROVED,
          reviewedById: audit.actorId,
          reviewedAt: now,
          approvedById: audit.actorId,
          approvedAt: now,
          updatedById: audit.actorId,
          approvals: {
            create: {
              approverId: audit.actorId,
              action: ApprovalAction.APPROVED,
              signedAt: now,
            },
          },
        },
      });

      await this.recordStatusHistory(tx, {
        dailyLogId: id,
        fromStatus: currentDailyLog.status,
        toStatus: DailyLogStatus.APPROVED,
        changedById: audit.actorId,
      });

      return updatedDailyLog;
    });

    await this.auditService.record({
      ...audit,
      action: "APPROVE",
      entity: "DailyLog",
      entityId: dailyLog.id,
    });

    return dailyLog;
  }

  async reject(
    id: string,
    rejectDailyLogDto: RejectDailyLogDto,
    audit: AuditRequestContext,
  ) {
    const currentDailyLog = await this.findOne(id);
    this.ensureTransitionAllowed(currentDailyLog, [DailyLogStatus.IN_REVIEW]);

    const now = new Date();
    const dailyLog = await this.prisma.$transaction(async (tx) => {
      const updatedDailyLog = await tx.dailyLog.update({
        where: { id },
        data: {
          status: DailyLogStatus.REJECTED,
          reviewedById: audit.actorId,
          reviewedAt: now,
          approvedById: null,
          approvedAt: null,
          comments: rejectDailyLogDto.comment,
          updatedById: audit.actorId,
          approvals: {
            create: {
              approverId: audit.actorId,
              action: ApprovalAction.REJECTED,
              comments: rejectDailyLogDto.comment,
            },
          },
        },
      });

      await this.recordStatusHistory(tx, {
        dailyLogId: id,
        fromStatus: currentDailyLog.status,
        toStatus: DailyLogStatus.REJECTED,
        changedById: audit.actorId,
        comments: rejectDailyLogDto.comment,
      });

      return updatedDailyLog;
    });

    await this.auditService.record({
      ...audit,
      action: "REJECT",
      entity: "DailyLog",
      entityId: dailyLog.id,
    });

    return dailyLog;
  }

  async close(id: string, audit: AuditRequestContext) {
    const currentDailyLog = await this.findOne(id);
    this.ensureTransitionAllowed(currentDailyLog, [DailyLogStatus.APPROVED]);

    const dailyLog = await this.prisma.$transaction(async (tx) => {
      const updatedDailyLog = await tx.dailyLog.update({
        where: { id },
        data: {
          status: DailyLogStatus.CLOSED,
          closedAt: new Date(),
          updatedById: audit.actorId,
        },
      });

      await this.recordStatusHistory(tx, {
        dailyLogId: id,
        fromStatus: currentDailyLog.status,
        toStatus: DailyLogStatus.CLOSED,
        changedById: audit.actorId,
      });

      return updatedDailyLog;
    });

    await this.auditService.record({
      ...audit,
      action: "CLOSE",
      entity: "DailyLog",
      entityId: dailyLog.id,
    });

    return dailyLog;
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
    return new Date(value);
  }

  private ensureDailyLogCanBeEdited(dailyLog: DailyLog) {
    if (
      dailyLog.status !== DailyLogStatus.DRAFT &&
      dailyLog.status !== DailyLogStatus.REJECTED
    ) {
      throw new BadRequestException(
        "Daily log can only be edited while it is DRAFT or REJECTED.",
      );
    }
  }

  private ensureTransitionAllowed(
    dailyLog: DailyLog,
    allowedStatuses: DailyLogStatus[],
  ) {
    if (!allowedStatuses.includes(dailyLog.status)) {
      throw new BadRequestException(
        `Invalid daily log transition from ${dailyLog.status}.`,
      );
    }
  }

  private async recordStatusHistory(
    tx: Prisma.TransactionClient,
    input: {
      dailyLogId: string;
      fromStatus: DailyLogStatus;
      toStatus: DailyLogStatus;
      changedById: string;
      comments?: string;
    },
  ) {
    await tx.dailyLogStatusHistory.create({
      data: {
        dailyLogId: input.dailyLogId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        changedById: input.changedById,
        comments: input.comments,
      },
    });
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
