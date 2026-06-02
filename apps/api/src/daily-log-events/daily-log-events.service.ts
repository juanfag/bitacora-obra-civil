import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DailyLog, DailyLogEvent, DailyLogStatus, Prisma, RecordStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AuditRequestContext } from "../audit/audit.types";
import { isEditableStatus } from "../daily-logs/daily-log-status.helper";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessPolicy } from "../projects/project-access.policy";
import { CreateDailyLogEventDto } from "./dto/create-daily-log-event.dto";
import { FindDailyLogEventsQueryDto } from "./dto/find-daily-log-events-query.dto";
import { UpdateDailyLogEventDto } from "./dto/update-daily-log-event.dto";

const dailyLogEventInclude = {
  eventType: {
    select: {
      code: true,
      description: true,
      name: true,
    },
  },
  reportedBy: {
    select: {
      email: true,
      fullName: true,
    },
  },
} satisfies Prisma.DailyLogEventInclude;

@Injectable()
export class DailyLogEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly projectAccessPolicy: ProjectAccessPolicy,
  ) {}

  async findAll(query: FindDailyLogEventsQueryDto, currentUserId: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const accessibleProjectIds =
      await this.projectAccessPolicy.getAccessibleProjectIds(currentUserId);

    if (accessibleProjectIds && accessibleProjectIds.length === 0) {
      return {
        items: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const where = this.buildWhere(query, accessibleProjectIds);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.dailyLogEvent.findMany({
        where,
        include: dailyLogEventInclude,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          reportedAt: "desc",
        },
      }),
      this.prisma.dailyLogEvent.count({ where }),
    ]);

    return {
      items: items.map((event) => this.toResponse(event)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUserId: string) {
    const event = await this.findActiveDailyLogEvent(id);
    await this.ensureUserCanAccessProject(
      currentUserId,
      event.dailyLog.projectId,
    );
    return this.toResponse(event);
  }

  async create(
    createDailyLogEventDto: CreateDailyLogEventDto,
    audit: AuditRequestContext,
  ) {
    const dailyLog = await this.ensureDailyLogExists(
      createDailyLogEventDto.dailyLogId,
    );
    if (audit.actorId) {
      await this.ensureUserCanAccessProject(audit.actorId, dailyLog.projectId);
    }
    this.ensureDailyLogCanEditEvents(dailyLog);
    await this.ensureEventTypeExists(createDailyLogEventDto.eventTypeId);

    try {
      const event = await this.prisma.dailyLogEvent.create({
        data: {
          dailyLogId: createDailyLogEventDto.dailyLogId,
          eventTypeId: createDailyLogEventDto.eventTypeId,
          activity: createDailyLogEventDto.activity,
          executionDescription: createDailyLogEventDto.executionDescription,
          reportedById: audit.actorId,
          reportedAt: this.toDate(createDailyLogEventDto.reportedAt),
        },
        include: dailyLogEventInclude,
      });

      await this.auditService.record({
        ...audit,
        action: "CREATE",
        entity: "DailyLogEvent",
        entityId: event.id,
      });

      return this.toResponse(event);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    updateDailyLogEventDto: UpdateDailyLogEventDto,
    audit: AuditRequestContext,
  ) {
    const currentEvent = await this.findActiveDailyLogEvent(id);
    if (audit.actorId) {
      await this.ensureUserCanAccessProject(
        audit.actorId,
        currentEvent.dailyLog.projectId,
      );
    }
    this.ensureDailyLogCanEditEvents(currentEvent.dailyLog);

    const dailyLog = updateDailyLogEventDto.dailyLogId
      ? await this.ensureDailyLogExists(updateDailyLogEventDto.dailyLogId)
      : undefined;

    if (dailyLog) {
      if (audit.actorId) {
        await this.ensureUserCanAccessProject(audit.actorId, dailyLog.projectId);
      }
      this.ensureDailyLogCanEditEvents(dailyLog);
    }

    if (updateDailyLogEventDto.eventTypeId) {
      await this.ensureEventTypeExists(updateDailyLogEventDto.eventTypeId);
    }

    try {
      const event = await this.prisma.dailyLogEvent.update({
        where: { id },
        data: {
          dailyLogId: updateDailyLogEventDto.dailyLogId,
          eventTypeId: updateDailyLogEventDto.eventTypeId,
          activity: updateDailyLogEventDto.activity,
          executionDescription:
            updateDailyLogEventDto.executionDescription,
          reportedAt: updateDailyLogEventDto.reportedAt
            ? this.toDate(updateDailyLogEventDto.reportedAt)
            : undefined,
        },
        include: dailyLogEventInclude,
      });

      await this.auditService.record({
        ...audit,
        action: "UPDATE",
        entity: "DailyLogEvent",
        entityId: event.id,
      });

      return this.toResponse(event);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string, audit: AuditRequestContext) {
    const currentEvent = await this.findActiveDailyLogEvent(id);
    if (audit.actorId) {
      await this.ensureUserCanAccessProject(
        audit.actorId,
        currentEvent.dailyLog.projectId,
      );
    }
    this.ensureDailyLogCanEditEvents(currentEvent.dailyLog);

    const event = await this.prisma.dailyLogEvent.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
      include: dailyLogEventInclude,
    });

    await this.auditService.record({
      ...audit,
      action: "DELETE",
      entity: "DailyLogEvent",
      entityId: event.id,
    });

    return this.toResponse(event);
  }

  private buildWhere(
    query: FindDailyLogEventsQueryDto,
    accessibleProjectIds: string[] | null,
  ): Prisma.DailyLogEventWhereInput {
    return {
      dailyLogId: query.dailyLogId,
      eventTypeId: query.eventTypeId,
      deletedAt: null,
      dailyLog: accessibleProjectIds
        ? {
            projectId: {
              in: accessibleProjectIds,
            },
          }
        : undefined,
      reportedAt:
        query.reportedFrom || query.reportedTo
          ? {
              gte: query.reportedFrom
                ? this.toDate(query.reportedFrom)
                : undefined,
              lte: query.reportedTo ? this.toDate(query.reportedTo) : undefined,
            }
          : undefined,
    };
  }

  private async ensureDailyLogExists(dailyLogId: string) {
    const dailyLog = await this.prisma.dailyLog.findFirst({
      where: {
        id: dailyLogId,
        status: {
          not: DailyLogStatus.VOIDED,
        },
      },
      select: {
        id: true,
        status: true,
        projectId: true,
      },
    });

    if (!dailyLog) {
      throw new BadRequestException("Invalid dailyLogId reference");
    }

    return dailyLog;
  }

  private async ensureEventTypeExists(eventTypeId: string) {
    const eventType = await this.prisma.eventType.findFirst({
      where: {
        id: eventTypeId,
        status: RecordStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    if (!eventType) {
      throw new BadRequestException("Invalid eventTypeId reference");
    }
  }

  private async findActiveDailyLogEvent(id: string) {
    const event = await this.prisma.dailyLogEvent.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        dailyLog: true,
        eventType: dailyLogEventInclude.eventType,
        reportedBy: dailyLogEventInclude.reportedBy,
      },
    });

    if (!event) {
      throw new NotFoundException("Daily log event not found");
    }

    return event;
  }

  private async ensureUserCanAccessProject(userId: string, projectId: string) {
    const canAccessProject = await this.projectAccessPolicy.canAccessProject(
      userId,
      projectId,
    );

    if (!canAccessProject) {
      throw new ForbiddenException("User does not have access to this project.");
    }
  }

  private ensureDailyLogCanEditEvents(
    dailyLog: Pick<DailyLog, "status">,
  ) {
    if (!isEditableStatus(dailyLog.status)) {
      throw new ConflictException(
        "Daily log events can only be edited while the daily log is DRAFT.",
      );
    }
  }

  private toDate(value: string) {
    return new Date(value);
  }

  private toResponse(
    event: DailyLogEvent & {
      eventType?: {
        code: string;
        description: string | null;
        name: string;
      } | null;
      reportedBy?: {
        email: string | null;
        fullName: string | null;
      } | null;
    },
  ) {
    return {
      id: event.id,
      dailyLogId: event.dailyLogId,
      eventTypeId: event.eventTypeId,
      eventType: event.eventType,
      activity: event.activity,
      executionDescription: event.executionDescription,
      reportedById: event.reportedById,
      reportedBy: event.reportedBy,
      reportedAt: event.reportedAt,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      deletedAt: event.deletedAt,
    };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        throw new BadRequestException(
          "Invalid dailyLogId, eventTypeId or reportedBy reference",
        );
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Daily log event not found");
      }
    }

    throw error;
  }
}
