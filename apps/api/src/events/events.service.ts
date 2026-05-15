import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DailyLog,
  DailyLogStatus,
  Event,
  EventStatus,
  Prisma,
  RecordStatus,
} from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AuditRequestContext } from "../audit/audit.types";
import { isEditableStatus } from "../daily-logs/daily-log-status.helper";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { FindEventsQueryDto } from "./dto/find-events-query.dto";
import { UpdateEventDto } from "./dto/update-event.dto";

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: FindEventsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          eventDatetime: "desc",
        },
      }),
      this.prisma.event.count({ where }),
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

  async findByDailyLog(dailyLogId: string, query: FindEventsQueryDto) {
    await this.ensureDailyLogExists(dailyLogId);

    return this.findAll({
      ...query,
      dailyLogId,
    });
  }

  async findOne(id: string) {
    const event = await this.findActiveEvent(id);
    return this.toResponse(event);
  }

  async create(createEventDto: CreateEventDto, audit: AuditRequestContext) {
    const dailyLog = await this.ensureDailyLogExists(createEventDto.dailyLogId);
    this.ensureDailyLogCanEditEvents(dailyLog);
    await this.ensureEventTypeExists(createEventDto.eventTypeId);

    try {
      const event = await this.prisma.event.create({
        data: {
          dailyLogId: createEventDto.dailyLogId,
          projectId: dailyLog.projectId,
          eventTypeId: createEventDto.eventTypeId,
          activity: createEventDto.title,
          description: createEventDto.description,
          executionDescription: createEventDto.executionDetails,
          eventDatetime: this.toDate(createEventDto.reportedAt),
          reportedById: audit.actorId,
          createdById: audit.actorId,
        },
      });

      await this.auditService.record({
        ...audit,
        action: "CREATE",
        entity: "Event",
        entityId: event.id,
      });

      return this.toResponse(event);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    updateEventDto: UpdateEventDto,
    audit: AuditRequestContext,
  ) {
    const currentEvent = await this.findActiveEvent(id);
    this.ensureDailyLogCanEditEvents(currentEvent.dailyLog);

    const dailyLog = updateEventDto.dailyLogId
      ? await this.ensureDailyLogExists(updateEventDto.dailyLogId)
      : undefined;

    if (dailyLog) {
      this.ensureDailyLogCanEditEvents(dailyLog);
    }

    if (updateEventDto.eventTypeId) {
      await this.ensureEventTypeExists(updateEventDto.eventTypeId);
    }

    try {
      const event = await this.prisma.event.update({
        where: { id },
        data: {
          dailyLogId: updateEventDto.dailyLogId,
          projectId: dailyLog?.projectId,
          eventTypeId: updateEventDto.eventTypeId,
          activity: updateEventDto.title,
          description: updateEventDto.description,
          executionDescription: updateEventDto.executionDetails,
          eventDatetime: updateEventDto.reportedAt
            ? this.toDate(updateEventDto.reportedAt)
            : undefined,
          updatedById: audit.actorId,
        },
      });

      await this.auditService.record({
        ...audit,
        action: "UPDATE",
        entity: "Event",
        entityId: event.id,
      });

      return this.toResponse(event);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string, audit: AuditRequestContext) {
    const currentEvent = await this.findActiveEvent(id);
    this.ensureDailyLogCanEditEvents(currentEvent.dailyLog);

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.VOIDED,
        deletedById: audit.actorId,
      },
    });

    await this.auditService.record({
      ...audit,
      action: "DELETE",
      entity: "Event",
      entityId: event.id,
    });

    return this.toResponse(event);
  }

  private buildWhere(query: FindEventsQueryDto): Prisma.EventWhereInput {
    return {
      dailyLogId: query.dailyLogId,
      eventTypeId: query.eventTypeId,
      status: query.status ?? {
        not: EventStatus.VOIDED,
      },
      eventDatetime:
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
        projectId: true,
        status: true,
      },
    });

    if (!dailyLog) {
      throw new BadRequestException("Invalid dailyLogId reference");
    }

    return dailyLog;
  }

  private async findActiveEvent(id: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        status: {
          not: EventStatus.VOIDED,
        },
      },
      include: {
        dailyLog: true,
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return event;
  }

  private ensureDailyLogCanEditEvents(
    dailyLog: Pick<DailyLog, "status">,
  ) {
    if (!isEditableStatus(dailyLog.status)) {
      throw new ConflictException(
        "Events can only be edited while the daily log is DRAFT.",
      );
    }
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

  private toDate(value: string) {
    return new Date(value);
  }

  private toResponse(event: Event) {
    return {
      id: event.id,
      dailyLogId: event.dailyLogId,
      projectId: event.projectId,
      eventTypeId: event.eventTypeId,
      title: event.activity,
      description: event.description,
      executionDetails: event.executionDescription,
      reportedById: event.reportedById,
      reportedAt: event.eventDatetime,
      status: event.status,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        throw new BadRequestException(
          "Invalid dailyLogId, eventTypeId, projectId or reportedBy reference",
        );
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Event not found");
      }
    }

    throw error;
  }
}
