import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ApprovalAction, DailyLog, DailyLogStatus, Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AuditRequestContext } from "../audit/audit.types";
import { PrismaService } from "../prisma/prisma.service";
import { RejectDailyLogDto } from "./dto/reject-daily-log.dto";

@Injectable()
export class DailyLogWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async void(id: string, audit: AuditRequestContext) {
    const currentDailyLog = await this.findActiveDailyLog(id);
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
    const currentDailyLog = await this.findActiveDailyLog(id);
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
    const currentDailyLog = await this.findActiveDailyLog(id);
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
    const currentDailyLog = await this.findActiveDailyLog(id);
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
    const currentDailyLog = await this.findActiveDailyLog(id);
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

  private async findActiveDailyLog(id: string) {
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

  private ensureTransitionAllowed(
    dailyLog: DailyLog,
    allowedStatuses: DailyLogStatus[],
  ) {
    // TODO: Replace this transition map with the official state machine after
    // migrating DailyLogStatus to OPEN/PENDING_APPROVAL/REOPENED/CANCELLED.
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
}
