import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ApprovalAction, DailyLog, DailyLogStatus, Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AuditActionType, AuditRequestContext } from "../audit/audit.types";
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
    this.ensureTransitionAllowed(currentDailyLog, [
      DailyLogStatus.DRAFT,
      DailyLogStatus.IN_REVIEW,
      DailyLogStatus.APPROVED,
      DailyLogStatus.REJECTED,
    ]);

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

    await this.recordWorkflowAudit(audit, {
      action: "VOID",
      entityId: dailyLog.id,
      workflowAction: "DAILY_LOG_VOIDED",
      fromStatus: currentDailyLog.status,
      toStatus: DailyLogStatus.VOIDED,
    });

    return dailyLog;
  }

  async submitForReview(id: string, audit: AuditRequestContext) {
    const currentDailyLog = await this.findActiveDailyLog(id);
    this.ensureTransitionAllowed(currentDailyLog, [DailyLogStatus.DRAFT]);

    const dailyLog = await this.prisma.$transaction(async (tx) => {
      const updatedDailyLog = await tx.dailyLog.update({
        where: { id },
        data: {
          status: DailyLogStatus.IN_REVIEW,
          submittedAt: new Date(),
          reviewedById: null,
          reviewedAt: null,
          approvedById: null,
          approvedByNameSnapshot: null,
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

    await this.recordWorkflowAudit(audit, {
      action: "SUBMIT",
      entityId: dailyLog.id,
      workflowAction: "DAILY_LOG_SUBMITTED",
      fromStatus: currentDailyLog.status,
      toStatus: DailyLogStatus.IN_REVIEW,
    });

    return dailyLog;
  }

  async approve(id: string, audit: AuditRequestContext) {
    const currentDailyLog = await this.findActiveDailyLog(id);
    this.ensureTransitionAllowed(currentDailyLog, [DailyLogStatus.IN_REVIEW]);

    const now = new Date();
    const actorName = await this.getUserNameSnapshot(audit.actorId);
    const responsibleName =
      currentDailyLog.responsibleNameSnapshot ??
      getUserName(currentDailyLog.createdBy) ??
      actorName;
    const dailyLog = await this.prisma.$transaction(async (tx) => {
      const updatedDailyLog = await tx.dailyLog.update({
        where: { id },
        data: {
          status: DailyLogStatus.APPROVED,
          responsibleNameSnapshot: responsibleName,
          reviewedById: audit.actorId,
          reviewedAt: now,
          approvedById: audit.actorId,
          approvedByNameSnapshot: actorName,
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

    await this.recordWorkflowAudit(audit, {
      action: "APPROVE",
      entityId: dailyLog.id,
      workflowAction: "DAILY_LOG_APPROVED",
      fromStatus: currentDailyLog.status,
      toStatus: DailyLogStatus.APPROVED,
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
          approvedByNameSnapshot: null,
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

    await this.recordWorkflowAudit(audit, {
      action: "REJECT",
      entityId: dailyLog.id,
      workflowAction: "DAILY_LOG_REJECTED",
      fromStatus: currentDailyLog.status,
      toStatus: DailyLogStatus.REJECTED,
      comments: rejectDailyLogDto.comment,
    });

    return dailyLog;
  }

  async close(id: string, audit: AuditRequestContext) {
    const currentDailyLog = await this.findActiveDailyLog(id);
    this.ensureTransitionAllowed(currentDailyLog, [DailyLogStatus.APPROVED]);

    const actorName = await this.getUserNameSnapshot(audit.actorId);
    const responsibleName =
      currentDailyLog.responsibleNameSnapshot ??
      getUserName(currentDailyLog.createdBy) ??
      actorName;
    const approvedByName =
      currentDailyLog.approvedByNameSnapshot ??
      getUserName(currentDailyLog.approvedBy) ??
      actorName;
    const dailyLog = await this.prisma.$transaction(async (tx) => {
      const updatedDailyLog = await tx.dailyLog.update({
        where: { id },
        data: {
          status: DailyLogStatus.CLOSED,
          responsibleNameSnapshot: responsibleName,
          approvedByNameSnapshot: approvedByName,
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

    await this.recordWorkflowAudit(audit, {
      action: "CLOSE",
      entityId: dailyLog.id,
      workflowAction: "DAILY_LOG_CLOSED",
      fromStatus: currentDailyLog.status,
      toStatus: DailyLogStatus.CLOSED,
    });

    return dailyLog;
  }

  async returnToDraft(id: string, audit: AuditRequestContext) {
    const currentDailyLog = await this.findActiveDailyLog(id);

    if (currentDailyLog.status !== DailyLogStatus.REJECTED) {
      throw new ConflictException("DailyLog must be REJECTED to return to DRAFT.");
    }

    const dailyLog = await this.prisma.$transaction(async (tx) => {
      const updatedDailyLog = await tx.dailyLog.update({
        where: { id },
        data: {
          status: DailyLogStatus.DRAFT,
          reviewedById: null,
          reviewedAt: null,
          approvedByNameSnapshot: null,
          updatedById: audit.actorId,
        },
      });

      await this.recordStatusHistory(tx, {
        dailyLogId: id,
        fromStatus: currentDailyLog.status,
        toStatus: DailyLogStatus.DRAFT,
        changedById: audit.actorId,
      });

      return updatedDailyLog;
    });

    await this.recordWorkflowAudit(audit, {
      action: "UPDATE",
      entityId: dailyLog.id,
      workflowAction: "DAILY_LOG_RETURNED_TO_DRAFT",
      fromStatus: currentDailyLog.status,
      toStatus: DailyLogStatus.DRAFT,
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
      include: {
        approvedBy: {
          select: {
            email: true,
            fullName: true,
          },
        },
        createdBy: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!dailyLog) {
      throw new NotFoundException("Daily log not found");
    }

    return dailyLog;
  }

  private async getUserNameSnapshot(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        fullName: true,
      },
    });

    return getUserName(user);
  }

  private ensureTransitionAllowed(
    dailyLog: DailyLog,
    allowedStatuses: DailyLogStatus[],
  ) {
    // TODO: Replace this transition map with the official state machine after
    // migrating DailyLogStatus to OPEN/PENDING_APPROVAL/REOPENED/CANCELLED.
    if (!allowedStatuses.includes(dailyLog.status)) {
      throw new ConflictException(
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

  private async recordWorkflowAudit(
    audit: AuditRequestContext,
    input: {
      action: AuditActionType;
      entityId: string;
      workflowAction: string;
      fromStatus: DailyLogStatus;
      toStatus: DailyLogStatus;
      comments?: string;
    },
  ) {
    await this.auditService.record({
      ...audit,
      action: input.action,
      entity: "DailyLog",
      entityId: input.entityId,
      oldValue: {
        status: input.fromStatus,
      },
      newValue: {
        status: input.toStatus,
        workflowAction: input.workflowAction,
        comments: input.comments,
      },
    });
  }
}

function getUserName(
  user: { email: string | null; fullName: string | null } | null | undefined,
) {
  if (!user) {
    return null;
  }

  return user.fullName || user.email || null;
}
