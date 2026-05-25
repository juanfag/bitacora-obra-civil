import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RecordStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { createHash } from "node:crypto";
import { basename, extname } from "node:path";
import { readFile, unlink } from "node:fs/promises";
import { AuditService } from "../audit/audit.service";
import { AuditRequestContext } from "../audit/audit.types";
import { PrismaService } from "../prisma/prisma.service";
import { UploadedFile } from "../uploads/upload-file.types";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

type UserFilters = {
  status?: RecordStatus;
  email?: string;
  fullName?: string;
  documentNumber?: string;
};

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  documentType: true,
  documentNumber: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const userSignatureSelect = {
  id: true,
  signatureFileName: true,
  signatureMimeType: true,
  signatureFileSize: true,
  signatureFileHash: true,
  signatureFileUrl: true,
  signatureUploadedAt: true,
} satisfies Prisma.UserSelect;

type UserSignatureRecord = Prisma.UserGetPayload<{
  select: typeof userSignatureSelect;
}>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(filters: UserFilters) {
    this.validateStatus(filters.status);

    return this.prisma.user.findMany({
      select: userSelect,
      where: {
        status: filters.status,
        email: filters.email
          ? {
              contains: filters.email,
              mode: "insensitive",
            }
          : undefined,
        fullName: filters.fullName
          ? {
              contains: filters.fullName,
              mode: "insensitive",
            }
          : undefined,
        documentNumber: filters.documentNumber
          ? {
              contains: filters.documentNumber,
              mode: "insensitive",
            }
          : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      select: userSelect,
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return user;
  }

  async create(createUserDto: CreateUserDto) {
    try {
      return await this.prisma.user.create({
        select: userSelect,
        data: {
          fullName: createUserDto.fullName,
          email: createUserDto.email,
          phone: createUserDto.phone,
          documentType: createUserDto.documentType,
          documentNumber: createUserDto.documentNumber,
          passwordHash: await this.hashPassword(createUserDto.password),
          status: createUserDto.status,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.ensureExists(id);

    try {
      return await this.prisma.user.update({
        select: userSelect,
        where: { id },
        data: {
          fullName: updateUserDto.fullName,
          email: updateUserDto.email,
          phone: updateUserDto.phone,
          documentType: updateUserDto.documentType,
          documentNumber: updateUserDto.documentNumber,
          status: updateUserDto.status,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);

    return this.prisma.user.update({
      select: userSelect,
      where: { id },
      data: {
        status: RecordStatus.INACTIVE,
      },
    });
  }

  async getMySignature(userId: string) {
    const user = await this.findUserSignature(userId);

    return this.toSignatureResponse(user);
  }

  async uploadMySignature(
    userId: string,
    file: UploadedFile,
    audit: AuditRequestContext,
  ) {
    let user: UserSignatureRecord;
    let oldSignaturePath: string | null = null;

    try {
      this.ensureSignatureFile(file);

      const currentUser = await this.findUserSignature(userId);
      oldSignaturePath = currentUser.signatureFileUrl;
      const checksum = await this.calculateSha256(file.path);
      const fileName = sanitizeSignatureFileName(file.originalname);
      user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          signatureFileName: fileName,
          signatureMimeType: file.mimetype,
          signatureFileSize: BigInt(file.size),
          signatureFileHash: checksum,
          signatureFileUrl: file.path,
          signatureUploadedAt: new Date(),
        },
        select: userSignatureSelect,
      });
    } catch (error) {
      await safeUnlink(file.path);
      throw error;
    }

    if (oldSignaturePath && oldSignaturePath !== file.path) {
      await safeUnlink(oldSignaturePath);
    }

    await this.auditService.record({
      ...audit,
      action: oldSignaturePath
        ? "USER_SIGNATURE_REPLACED"
        : "USER_SIGNATURE_UPLOADED",
      entity: "User",
      entityId: userId,
      newValue: {
        hasSignature: true,
        mimeType: user.signatureMimeType,
        fileSize: user.signatureFileSize ? Number(user.signatureFileSize) : null,
      },
    });

    return this.toSignatureResponse(user);
  }

  async deleteMySignature(userId: string, audit: AuditRequestContext) {
    const currentUser = await this.findUserSignature(userId);
    const signaturePath = currentUser.signatureFileUrl;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        signatureFileName: null,
        signatureMimeType: null,
        signatureFileSize: null,
        signatureFileHash: null,
        signatureFileUrl: null,
        signatureUploadedAt: null,
      },
      select: userSignatureSelect,
    });

    if (signaturePath) {
      await safeUnlink(signaturePath);
    }

    await this.auditService.record({
      ...audit,
      action: "USER_SIGNATURE_DELETED",
      entity: "User",
      entityId: userId,
      oldValue: {
        hadSignature: Boolean(signaturePath),
      },
      newValue: {
        hasSignature: false,
      },
    });

    return this.toSignatureResponse(user);
  }

  async discardUploadedSignatureFile(filePath: string | undefined) {
    if (filePath) {
      await safeUnlink(filePath);
    }
  }

  private async ensureExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }
  }

  private async findUserSignature(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSignatureSelect,
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return user;
  }

  private ensureSignatureFile(file: UploadedFile | undefined) {
    if (!file) {
      throw new BadRequestException("Signature file is required.");
    }

    if (file.mimetype !== "image/png" && file.mimetype !== "image/jpeg") {
      throw new BadRequestException("Signature must be a PNG or JPG image.");
    }

    if (file.size > 1024 * 1024) {
      throw new BadRequestException("Signature image exceeds 1 MB.");
    }
  }

  private async calculateSha256(filePath: string) {
    const buffer = await readFile(filePath);

    return createHash("sha256").update(buffer).digest("hex");
  }

  private async toSignatureResponse(user: UserSignatureRecord) {
    const hasSignature = Boolean(user.signatureFileUrl);

    return {
      hasSignature,
      documentId: null,
      fileName: user.signatureFileName,
      mimeType: user.signatureMimeType,
      fileSize: user.signatureFileSize ? Number(user.signatureFileSize) : null,
      uploadedAt: user.signatureUploadedAt,
      previewDataUrl: hasSignature ? await this.getSignatureDataUrl(user) : null,
    };
  }

  private async getSignatureDataUrl(user: UserSignatureRecord) {
    if (!user.signatureFileUrl || !user.signatureMimeType) {
      return null;
    }

    try {
      const buffer = await readFile(user.signatureFileUrl);

      return `data:${user.signatureMimeType};base64,${buffer.toString("base64")}`;
    } catch {
      return null;
    }
  }

  private validateStatus(status?: RecordStatus) {
    if (status && !Object.values(RecordStatus).includes(status)) {
      throw new BadRequestException("Estado de usuario invalido");
    }
  }

  private async hashPassword(password?: string) {
    return password ? bcrypt.hash(password, 10) : undefined;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ConflictException(this.getUniqueConflictMessage(error));
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Usuario no encontrado");
      }
    }

    throw error;
  }

  private getUniqueConflictMessage(
    error: Prisma.PrismaClientKnownRequestError,
  ) {
    const target = String(error.meta?.target ?? "");

    if (target.includes("email")) {
      return "Ya existe un usuario con este email.";
    }

    if (
      target.includes("documentType") ||
      target.includes("document_type") ||
      target.includes("documentNumber") ||
      target.includes("document_number")
    ) {
      return "Ya existe un usuario con este tipo y numero de documento.";
    }

    return "Ya existe un usuario con los mismos datos unicos.";
  }
}

function sanitizeSignatureFileName(fileName: string) {
  const baseName = basename(fileName || "firma-usuario")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  const extension = extname(baseName).toLowerCase();
  const nameWithoutExtension = extension
    ? baseName.slice(0, -extension.length)
    : baseName;
  const safeName = (nameWithoutExtension || "firma-usuario").slice(0, 120);

  return `${safeName}${extension}`.slice(0, 150);
}

async function safeUnlink(filePath: string) {
  try {
    await unlink(filePath);
  } catch {
    return;
  }
}
