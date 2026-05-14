import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RecordStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AuditRequestContext } from "../audit/audit.types";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventTypeDto } from "./dto/create-event-type.dto";
import { UpdateEventTypeDto } from "./dto/update-event-type.dto";

type EventTypeFilters = {
  status?: RecordStatus;
};

@Injectable()
export class EventTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(filters: EventTypeFilters) {
    this.validateStatus(filters.status);

    return this.prisma.eventType.findMany({
      where: {
        status: filters.status ?? {
          not: RecordStatus.DELETED,
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async findOne(id: string) {
    const eventType = await this.prisma.eventType.findFirst({
      where: {
        id,
        status: {
          not: RecordStatus.DELETED,
        },
      },
    });

    if (!eventType) {
      throw new NotFoundException("Event type not found");
    }

    return eventType;
  }

  async create(
    createEventTypeDto: CreateEventTypeDto,
    audit: AuditRequestContext,
  ) {
    try {
      const eventType = await this.prisma.eventType.create({
        data: {
          code: createEventTypeDto.code,
          name: createEventTypeDto.name,
          description: createEventTypeDto.description,
          attachmentRequirement: createEventTypeDto.attachmentRequirement,
          requiresSignature: createEventTypeDto.requiresSignature,
          status: createEventTypeDto.status,
        },
      });

      await this.auditService.record({
        ...audit,
        action: "CREATE",
        entity: "EventType",
        entityId: eventType.id,
      });

      return eventType;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    updateEventTypeDto: UpdateEventTypeDto,
    audit: AuditRequestContext,
  ) {
    await this.ensureExists(id);

    try {
      const eventType = await this.prisma.eventType.update({
        where: { id },
        data: {
          code: updateEventTypeDto.code,
          name: updateEventTypeDto.name,
          description: updateEventTypeDto.description,
          attachmentRequirement: updateEventTypeDto.attachmentRequirement,
          requiresSignature: updateEventTypeDto.requiresSignature,
          status: updateEventTypeDto.status,
        },
      });

      await this.auditService.record({
        ...audit,
        action: "UPDATE",
        entity: "EventType",
        entityId: eventType.id,
      });

      return eventType;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string, audit: AuditRequestContext) {
    await this.ensureExists(id);

    const eventType = await this.prisma.eventType.update({
      where: { id },
      data: {
        status: RecordStatus.DELETED,
      },
    });

    await this.auditService.record({
      ...audit,
      action: "DELETE",
      entity: "EventType",
      entityId: eventType.id,
    });

    return eventType;
  }

  private async ensureExists(id: string) {
    const eventType = await this.prisma.eventType.findFirst({
      where: {
        id,
        status: {
          not: RecordStatus.DELETED,
        },
      },
      select: { id: true },
    });

    if (!eventType) {
      throw new NotFoundException("Event type not found");
    }
  }

  private validateStatus(status?: RecordStatus) {
    if (status && !Object.values(RecordStatus).includes(status)) {
      throw new BadRequestException("Invalid event type status");
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ConflictException("Event type code already exists");
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Event type not found");
      }
    }

    throw error;
  }
}
