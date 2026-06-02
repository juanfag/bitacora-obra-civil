import { Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogInput } from "./audit.types";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditLogInput) {
    const actorSnapshot = input.actorId
      ? await this.prisma.user.findUnique({
          where: { id: input.actorId },
          select: {
            email: true,
            fullName: true,
          },
        })
      : null;

    await this.prisma.auditLog.create({
      data: {
        entityName: input.entity,
        entityId: input.entityId,
        action: AuditAction[input.action],
        performedById: input.actorId,
        oldValue: input.oldValue as Prisma.InputJsonValue | undefined,
        newValue: input.newValue as Prisma.InputJsonValue | undefined,
        actorNameSnapshot: actorSnapshot?.fullName,
        actorEmailSnapshot: actorSnapshot?.email,
        ipAddress: input.ip,
        deviceInfo: input.userAgent,
      },
    });
  }
}
