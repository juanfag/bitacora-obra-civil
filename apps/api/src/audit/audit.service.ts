import { Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogInput } from "./audit.types";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditLogInput) {
    await this.prisma.auditLog.create({
      data: {
        entityName: input.entity,
        entityId: input.entityId,
        action: AuditAction[input.action],
        performedById: input.actorId,
        oldValue: input.oldValue as Prisma.InputJsonValue | undefined,
        newValue: input.newValue as Prisma.InputJsonValue | undefined,
        ipAddress: input.ip,
        deviceInfo: input.userAgent,
      },
    });
  }
}
