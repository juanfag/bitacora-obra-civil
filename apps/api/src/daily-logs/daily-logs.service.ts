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

    try {
      const dailyLog = await this.prisma.dailyLog.create({
        data: {
          projectId: createDailyLogDto.projectId,
          logDate: this.toDate(createDailyLogDto.logDate),
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
    if (!isEditableStatus(dailyLog.status)) {
      throw new BadRequestException(
        "Daily log can only be edited while it is DRAFT or REJECTED.",
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
