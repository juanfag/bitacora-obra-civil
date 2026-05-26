import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import {
  DailyLogSignature,
  DailyLogSignatureType,
  DailyLogStatus,
  Prisma,
  RecordStatus,
} from "@prisma/client";
import { copyFile, mkdir, readFile, stat, unlink } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { AuditService } from "../audit/audit.service";
import { AuditRequestContext } from "../audit/audit.types";
import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessPolicy } from "../projects/project-access.policy";
import { uploadConfig } from "../uploads/upload.config";

const SIGNABLE_STATUSES = new Set<DailyLogStatus>([
  DailyLogStatus.APPROVED,
  DailyLogStatus.CLOSED,
]);

const signatureSelect = {
  id: true,
  dailyLogId: true,
  signerUserId: true,
  signerName: true,
  signerEmail: true,
  signerRole: true,
  signatureType: true,
  signatureSnapshotPath: true,
  signatureSnapshotMimeType: true,
  signatureSnapshotFileName: true,
  signatureSnapshotFileSize: true,
  signedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DailyLogSignatureSelect;

type SignatureRecord = Prisma.DailyLogSignatureGetPayload<{
  select: typeof signatureSelect;
}>;

@Injectable()
export class DailyLogSignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly projectAccessPolicy: ProjectAccessPolicy,
    @Inject(uploadConfig.KEY)
    private readonly config: ConfigType<typeof uploadConfig>,
  ) {}

  async findByDailyLog(id: string, user: CurrentUserPayload) {
    await this.ensureDailyLogAccess(id, user.sub);
    const signatures = await this.prisma.dailyLogSignature.findMany({
      where: { dailyLogId: id },
      orderBy: { signedAt: "asc" },
      select: signatureSelect,
    });

    return Promise.all(signatures.map(toSignatureResponse));
  }

  async applySignature(
    id: string,
    signatureType: DailyLogSignatureType,
    user: CurrentUserPayload,
    audit: AuditRequestContext,
  ) {
    const dailyLog = await this.ensureDailyLogAccess(id, user.sub);

    if (!SIGNABLE_STATUSES.has(dailyLog.status)) {
      throw new ConflictException(
        "La bitacora solo puede firmarse cuando esta APPROVED o CLOSED.",
      );
    }

    const signer = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        id: true,
        fullName: true,
        email: true,
        signatureFileName: true,
        signatureMimeType: true,
        signatureFileSize: true,
        signatureFileUrl: true,
      },
    });

    if (!signer) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const signatureFileUrl = signer.signatureFileUrl;
    const signatureMimeType = signer.signatureMimeType;

    if (!signatureFileUrl || !signatureMimeType) {
      throw new ConflictException(
        "Debes registrar tu firma en Mi perfil antes de firmar.",
      );
    }

    if (!isAllowedSignatureMimeType(signatureMimeType)) {
      throw new BadRequestException("La firma registrada no es PNG o JPG.");
    }

    const existingSignature = await this.prisma.dailyLogSignature.findUnique({
      where: {
        dailyLogId_signatureType: {
          dailyLogId: id,
          signatureType,
        },
      },
      select: { id: true },
    });

    if (existingSignature) {
      throw new ConflictException(
        "Ya existe una firma aplicada para este rol en la bitacora.",
      );
    }

    const sourceStat = await stat(signatureFileUrl).catch(() => null);

    if (!sourceStat?.isFile()) {
      throw new ConflictException(
        "La firma registrada no esta disponible. Vuelve a cargarla en Mi perfil.",
      );
    }

    const snapshotFileName = buildSnapshotFileName(id, signatureType, {
      id: signer.id,
      signatureFileName: signer.signatureFileName,
      signatureMimeType,
    });
    const snapshotDirectory = join(this.config.path, "daily-log-signatures", id);
    const snapshotPath = join(snapshotDirectory, snapshotFileName);

    await mkdir(snapshotDirectory, { recursive: true });
    await copyFile(signatureFileUrl, snapshotPath);

    try {
      const signature = await this.prisma.dailyLogSignature.create({
        data: {
          dailyLogId: id,
          signerUserId: user.sub,
          signerName: signer.fullName,
          signerEmail: signer.email,
          signerRole: await this.resolveSignerRole(id, user.sub),
          signatureType,
          signatureSnapshotPath: snapshotPath,
          signatureSnapshotMimeType: signatureMimeType,
          signatureSnapshotFileName: snapshotFileName,
          signatureSnapshotFileSize: BigInt(sourceStat.size),
          ipAddress: audit.ip,
          userAgent: audit.userAgent,
        },
        select: signatureSelect,
      });

      await this.auditService.record({
        ...audit,
        action: "DAILY_LOG_SIGNATURE_APPLIED",
        entity: "DailyLogSignature",
        entityId: signature.id,
        newValue: {
          dailyLogId: id,
          operation: "CREATED",
          projectId: dailyLog.projectId,
          signedAt: signature.signedAt.toISOString(),
          signatureType,
          signerName: signature.signerName,
          signerUserId: user.sub,
          signerRole: signature.signerRole,
        },
      });

      return toSignatureResponse(signature);
    } catch (error) {
      await safeUnlink(snapshotPath);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Ya existe una firma aplicada para este rol en la bitacora.",
        );
      }

      throw error;
    }
  }

  private async ensureDailyLogAccess(id: string, userId: string) {
    const dailyLog = await this.prisma.dailyLog.findFirst({
      where: {
        id,
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
      throw new NotFoundException("Daily log not found");
    }

    const canAccessProject = await this.projectAccessPolicy.canAccessProject(
      userId,
      dailyLog.projectId,
    );

    if (!canAccessProject) {
      throw new ForbiddenException("User does not have access to this project.");
    }

    return dailyLog;
  }

  private async resolveSignerRole(dailyLogId: string, userId: string) {
    const assignment = await this.prisma.projectUser.findFirst({
      where: {
        userId,
        status: RecordStatus.ACTIVE,
        project: {
          dailyLogs: {
            some: {
              id: dailyLogId,
            },
          },
        },
        role: {
          status: RecordStatus.ACTIVE,
        },
      },
      select: {
        role: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        assignedAt: "asc",
      },
    });

    if (!assignment) {
      return "Usuario";
    }

    return assignment.role.name || assignment.role.code || "Usuario";
  }
}

async function toSignatureResponse(signature: SignatureRecord) {
  return {
    id: signature.id,
    dailyLogId: signature.dailyLogId,
    signerUserId: signature.signerUserId,
    signerName: signature.signerName,
    signerEmail: signature.signerEmail,
    signerRole: signature.signerRole,
    signatureType: signature.signatureType,
    fileName: signature.signatureSnapshotFileName,
    mimeType: signature.signatureSnapshotMimeType,
    fileSize: Number(signature.signatureSnapshotFileSize),
    signedAt: signature.signedAt,
    previewDataUrl: await getSignaturePreviewDataUrl(signature),
  };
}

async function getSignaturePreviewDataUrl(signature: SignatureRecord) {
  if (!isAllowedSignatureMimeType(signature.signatureSnapshotMimeType)) {
    return null;
  }

  try {
    const buffer = await readFile(signature.signatureSnapshotPath);

    return `data:${signature.signatureSnapshotMimeType};base64,${buffer.toString(
      "base64",
    )}`;
  } catch {
    return null;
  }
}

function buildSnapshotFileName(
  dailyLogId: string,
  signatureType: DailyLogSignatureType,
  signer: { id: string; signatureFileName: string | null; signatureMimeType: string },
) {
  const extension =
    extname(signer.signatureFileName ?? "").toLowerCase() ||
    (signer.signatureMimeType === "image/png" ? ".png" : ".jpg");
  const safeExtension = extension === ".png" ? ".png" : ".jpg";
  const dailyLogPrefix = dailyLogId.slice(0, 8);
  const signerPrefix = signer.id.slice(0, 8);

  return basename(
    `firma-${dailyLogPrefix}-${signatureType.toLowerCase()}-${signerPrefix}${safeExtension}`,
  );
}

function isAllowedSignatureMimeType(value: string) {
  return value === "image/png" || value === "image/jpeg";
}

async function safeUnlink(filePath: string) {
  try {
    await unlink(filePath);
  } catch {
    return;
  }
}
