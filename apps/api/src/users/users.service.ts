import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RecordStatus, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { createHash } from "node:crypto";
import { basename, extname } from "node:path";
import { readFile, unlink } from "node:fs/promises";
import { AuditService } from "../audit/audit.service";
import { AuditRequestContext } from "../audit/audit.types";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessPolicy } from "../projects/project-access.policy";
import { UploadedFile } from "../uploads/upload-file.types";
import { AssignUserRolesDto } from "./dto/assign-user-roles.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import {
  UserReadDto,
  UsersReadListResponseDto,
} from "./dto/user-read-response.dto";

type UserFilters = {
  currentUserId: string;
  status?: UserStatus;
  email?: string;
  fullName?: string;
  documentNumber?: string;
  search?: string;
  page?: string;
  limit?: string;
};

type NormalizedRoleAssignment = {
  projectId: string;
  roleId: string;
};

const ADMIN_PERMISSION_CODES = [
  "users:manage",
  "organizations:create",
  "organizations:update",
] satisfies string[];

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

const userReadSelect = {
  id: true,
  fullName: true,
  email: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  projectAssignments: {
    select: {
      status: true,
      role: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      project: {
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

type UserReadRecord = Prisma.UserGetPayload<{
  select: typeof userReadSelect;
}>;

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
    private readonly projectAccessPolicy: ProjectAccessPolicy,
  ) {}

  async findAll(filters: UserFilters): Promise<UsersReadListResponseDto> {
    this.validateStatus(filters.status);
    const accessibleProjectIds =
      await this.projectAccessPolicy.getAccessibleProjectIds(
        filters.currentUserId,
      );
    const pagination = parsePagination(filters.page, filters.limit);

    if (accessibleProjectIds && accessibleProjectIds.length === 0) {
      return {
        items: [],
        meta: {
          page: pagination.page,
          limit: pagination.limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const where = buildUserReadWhere(filters, accessibleProjectIds);
    const assignmentWhere = buildVisibleAssignmentWhere(accessibleProjectIds);

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        select: {
          ...userReadSelect,
          projectAssignments: {
            where: assignmentWhere,
            select: userReadSelect.projectAssignments.select,
          },
        },
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
    ]);

    return {
      items: users.map(toUserReadDto),
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findOne(id: string, currentUserId: string): Promise<UserReadDto> {
    const accessibleProjectIds =
      await this.projectAccessPolicy.getAccessibleProjectIds(currentUserId);

    if (accessibleProjectIds && accessibleProjectIds.length === 0) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const assignmentWhere = buildVisibleAssignmentWhere(accessibleProjectIds);
    const user = await this.prisma.user.findUnique({
      select: {
        ...userReadSelect,
        projectAssignments: {
          where: assignmentWhere,
          select: userReadSelect.projectAssignments.select,
        },
      },
      where: { id },
    });

    if (
      !user ||
      (accessibleProjectIds &&
        accessibleProjectIds.length > 0 &&
        user.projectAssignments.length === 0)
    ) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return toUserReadDto(user);
  }

  async updateRoles(
    targetUserId: string,
    assignUserRolesDto: AssignUserRolesDto,
    actorUserId: string,
    audit: AuditRequestContext,
  ): Promise<UserReadDto> {
    const assignments = normalizeRoleAssignments(
      assignUserRolesDto.assignments,
    );
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const accessibleProjectIds =
      await this.projectAccessPolicy.getAccessibleProjectIds(actorUserId);

    if (accessibleProjectIds && accessibleProjectIds.length === 0) {
      throw new ForbiddenException("No tiene proyectos disponibles.");
    }

    await this.validateRoleAssignmentScope(assignments, accessibleProjectIds);
    await this.validateAssignableRoles(assignments, actorUserId);

    const assignmentScope = buildVisibleAssignmentWhere(accessibleProjectIds);
    const oldAssignments = await this.findUserRoleAssignments(
      targetUserId,
      assignmentScope,
    );

    if (
      accessibleProjectIds &&
      oldAssignments.length === 0 &&
      assignments.length === 0
    ) {
      throw new NotFoundException("Usuario no encontrado");
    }

    if (targetUserId === actorUserId) {
      await this.ensureSelfKeepsAdministrativeRole(
        targetUserId,
        assignments,
        accessibleProjectIds,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const desiredKeys = new Set(
        assignments.map((assignment) => assignmentKey(assignment)),
      );
      const existingAssignments = await tx.projectUser.findMany({
        where: {
          userId: targetUserId,
          projectId: accessibleProjectIds
            ? {
                in: accessibleProjectIds,
              }
            : undefined,
        },
        select: {
          id: true,
          projectId: true,
          roleId: true,
          status: true,
        },
      });

      await Promise.all(
        existingAssignments
          .filter((assignment) => !desiredKeys.has(assignmentKey(assignment)))
          .filter((assignment) => assignment.status === RecordStatus.ACTIVE)
          .map((assignment) =>
            tx.projectUser.update({
              where: { id: assignment.id },
              data: {
                status: RecordStatus.INACTIVE,
              },
            }),
          ),
      );

      for (const assignment of assignments) {
        const existingAssignment = existingAssignments.find(
          (candidate) => assignmentKey(candidate) === assignmentKey(assignment),
        );

        if (existingAssignment) {
          if (existingAssignment.status !== RecordStatus.ACTIVE) {
            await tx.projectUser.update({
              where: { id: existingAssignment.id },
              data: {
                assignedAt: new Date(),
                assignedById: actorUserId,
                status: RecordStatus.ACTIVE,
              },
            });
          }

          continue;
        }

        await tx.projectUser.create({
          data: {
            assignedById: actorUserId,
            projectId: assignment.projectId,
            roleId: assignment.roleId,
            userId: targetUserId,
            status: RecordStatus.ACTIVE,
          },
        });
      }
    });

    const newAssignments = await this.findUserRoleAssignments(
      targetUserId,
      assignmentScope,
    );

    await this.auditService.record({
      ...audit,
      action: "UPDATE",
      entity: "User",
      entityId: targetUserId,
      oldValue: {
        roles: oldAssignments,
      },
      newValue: {
        roles: newAssignments,
      },
    });

    return this.findOne(targetUserId, actorUserId);
  }

  async updateStatus(
    targetUserId: string,
    updateUserStatusDto: UpdateUserStatusDto,
    actorUserId: string,
    audit: AuditRequestContext,
  ): Promise<UserReadDto> {
    if (targetUserId === actorUserId) {
      throw new ConflictException("No puede cambiar su propio estado.");
    }

    this.validateStatus(updateUserStatusDto.status);

    const accessibleProjectIds =
      await this.projectAccessPolicy.getAccessibleProjectIds(actorUserId);

    if (accessibleProjectIds && accessibleProjectIds.length === 0) {
      throw new ForbiddenException("No tiene proyectos disponibles.");
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        status: true,
        blockedReason: true,
        projectAssignments: {
          where: {
            status: RecordStatus.ACTIVE,
            projectId: accessibleProjectIds
              ? {
                  in: accessibleProjectIds,
                }
              : undefined,
          },
          select: {
            projectId: true,
          },
        },
      },
    });

    if (!targetUser) {
      throw new NotFoundException("Usuario no encontrado");
    }

    if (accessibleProjectIds && targetUser.projectAssignments.length === 0) {
      throw new ForbiddenException("No puede administrar este usuario.");
    }

    if (
      targetUser.status === UserStatus.ACTIVE &&
      isNonActiveUserStatus(updateUserStatusDto.status)
    ) {
      await this.ensureNotLastActiveSuperAdmin(targetUserId);
      await this.ensureNotLastActiveOrganizationAdmin(targetUserId);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        status: updateUserStatusDto.status,
        statusChangedAt: new Date(),
        statusChangedById: actorUserId,
        blockedReason:
          updateUserStatusDto.status === UserStatus.BLOCKED
            ? updateUserStatusDto.reason ?? null
            : null,
        tokenVersion: {
          increment: 1,
        },
      },
      select: {
        id: true,
        status: true,
        blockedReason: true,
        statusChangedAt: true,
        statusChangedById: true,
        tokenVersion: true,
      },
    });

    await this.auditService.record({
      ...audit,
      action: "UPDATE",
      entity: "User",
      entityId: targetUserId,
      oldValue: {
        status: targetUser.status,
        blockedReason: targetUser.blockedReason,
      },
      newValue: {
        status: updatedUser.status,
        blockedReason: updatedUser.blockedReason,
        statusChangedAt: updatedUser.statusChangedAt,
        statusChangedById: updatedUser.statusChangedById,
        tokenVersion: updatedUser.tokenVersion,
      },
    });

    return this.findOne(targetUserId, actorUserId);
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
        status: UserStatus.INACTIVE,
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

  private validateStatus(status?: UserStatus) {
    if (status && !Object.values(UserStatus).includes(status)) {
      throw new BadRequestException("Estado de usuario invalido");
    }
  }

  private async hashPassword(password?: string) {
    return password ? bcrypt.hash(password, 10) : undefined;
  }

  private async validateRoleAssignmentScope(
    assignments: NormalizedRoleAssignment[],
    accessibleProjectIds: string[] | null,
  ) {
    const projectIds = [...new Set(assignments.map(({ projectId }) => projectId))];

    if (projectIds.length === 0) {
      return;
    }

    if (accessibleProjectIds) {
      const inaccessibleProjectId = projectIds.find(
        (projectId) => !accessibleProjectIds.includes(projectId),
      );

      if (inaccessibleProjectId) {
        throw new ForbiddenException(
          "No puede asignar roles fuera de sus proyectos.",
        );
      }
    }

    const projects = await this.prisma.project.findMany({
      where: {
        id: {
          in: projectIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (projects.length !== projectIds.length) {
      throw new BadRequestException("Uno o mas proyectos no existen.");
    }
  }

  private async validateAssignableRoles(
    assignments: NormalizedRoleAssignment[],
    actorUserId: string,
  ) {
    const roleIds = [...new Set(assignments.map(({ roleId }) => roleId))];

    if (roleIds.length === 0) {
      return;
    }

    const roles = await this.prisma.role.findMany({
      where: {
        id: {
          in: roleIds,
        },
        status: RecordStatus.ACTIVE,
      },
      select: {
        id: true,
        rolePermissions: {
          where: {
            permission: {
              status: RecordStatus.ACTIVE,
            },
          },
          select: {
            permission: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    if (roles.length !== roleIds.length) {
      throw new BadRequestException("Uno o mas roles no existen o estan inactivos.");
    }

    const actorPermissions = await this.getUserPermissionCodes(actorUserId);
    const missingPermission = roles
      .flatMap((role) =>
        role.rolePermissions.map(
          (rolePermission) => rolePermission.permission.code,
        ),
      )
      .find((permissionCode) => !actorPermissions.has(permissionCode));

    if (missingPermission) {
      throw new ForbiddenException(
        "No puede asignar roles con privilegios superiores a su alcance.",
      );
    }
  }

  private async ensureSelfKeepsAdministrativeRole(
    targetUserId: string,
    assignments: NormalizedRoleAssignment[],
    accessibleProjectIds: string[] | null,
  ) {
    const currentAssignments = await this.prisma.projectUser.findMany({
      where: {
        userId: targetUserId,
        status: RecordStatus.ACTIVE,
      },
      select: {
        projectId: true,
        roleId: true,
        role: {
          select: {
            rolePermissions: {
              where: {
                permission: {
                  status: RecordStatus.ACTIVE,
                },
              },
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    const currentlyHasAdmin = currentAssignments.some((assignment) =>
      roleHasAdminPermission(assignment.role),
    );

    if (!currentlyHasAdmin) {
      return;
    }

    const scopedProjectIds = accessibleProjectIds
      ? new Set(accessibleProjectIds)
      : null;
    const replacementKeys = new Set(assignments.map(assignmentKey));
    const remainingExistingAssignments = currentAssignments.filter(
      (assignment) =>
        scopedProjectIds && !scopedProjectIds.has(assignment.projectId),
    );
    const replacementRoleIds = [...new Set(assignments.map(({ roleId }) => roleId))];
    const replacementRoles = replacementRoleIds.length
      ? await this.prisma.role.findMany({
          where: {
            id: {
              in: replacementRoleIds,
            },
          },
          select: {
            id: true,
            rolePermissions: {
              where: {
                permission: {
                  status: RecordStatus.ACTIVE,
                },
              },
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        })
      : [];
    const roleById = new Map(replacementRoles.map((role) => [role.id, role]));
    const replacementAssignments = assignments
      .filter((assignment) => replacementKeys.has(assignmentKey(assignment)))
      .map((assignment) => roleById.get(assignment.roleId))
      .filter((role): role is NonNullable<typeof role> => Boolean(role));
    const willKeepAdmin =
      remainingExistingAssignments.some((assignment) =>
        roleHasAdminPermission(assignment.role),
      ) || replacementAssignments.some(roleHasAdminPermission);

    if (!willKeepAdmin) {
      throw new ConflictException(
        "No puede quitarse a si mismo su ultimo rol administrativo.",
      );
    }
  }

  private async ensureNotLastActiveSuperAdmin(targetUserId: string) {
    const targetHasSuperAdmin = await this.prisma.projectUser.findFirst({
      where: {
        userId: targetUserId,
        status: RecordStatus.ACTIVE,
        role: {
          code: "SUPER_ADMIN",
          status: RecordStatus.ACTIVE,
        },
      },
      select: {
        id: true,
      },
    });

    if (!targetHasSuperAdmin) {
      return;
    }

    const activeSuperAdmins = await this.prisma.user.count({
      where: {
        status: UserStatus.ACTIVE,
        projectAssignments: {
          some: {
            status: RecordStatus.ACTIVE,
            role: {
              code: "SUPER_ADMIN",
              status: RecordStatus.ACTIVE,
            },
          },
        },
      },
    });

    if (activeSuperAdmins <= 1) {
      throw new ConflictException(
        "No puede desactivar o bloquear el ultimo SUPER_ADMIN activo.",
      );
    }
  }

  private async ensureNotLastActiveOrganizationAdmin(targetUserId: string) {
    const targetAdminOrganizations = await this.prisma.organization.findMany({
      where: {
        projects: {
          some: {
            projectUsers: {
              some: {
                userId: targetUserId,
                status: RecordStatus.ACTIVE,
                role: {
                  status: RecordStatus.ACTIVE,
                  rolePermissions: {
                    some: {
                      permission: {
                        code: {
                          in: ADMIN_PERMISSION_CODES,
                        },
                        status: RecordStatus.ACTIVE,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (targetAdminOrganizations.length === 0) {
      return;
    }

    for (const organization of targetAdminOrganizations) {
      const activeAdmins = await this.prisma.user.count({
        where: {
          status: UserStatus.ACTIVE,
          projectAssignments: {
            some: {
              status: RecordStatus.ACTIVE,
              project: {
                organizationId: organization.id,
              },
              role: {
                status: RecordStatus.ACTIVE,
                rolePermissions: {
                  some: {
                    permission: {
                      code: {
                        in: ADMIN_PERMISSION_CODES,
                      },
                      status: RecordStatus.ACTIVE,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (activeAdmins <= 1) {
        throw new ConflictException(
          "No puede desactivar o bloquear el ultimo administrador activo de una organizacion.",
        );
      }
    }
  }

  private async findUserRoleAssignments(
    userId: string,
    assignmentScope: Prisma.ProjectUserWhereInput,
  ) {
    const assignments = await this.prisma.projectUser.findMany({
      where: {
        userId,
        ...assignmentScope,
        status: RecordStatus.ACTIVE,
      },
      select: {
        projectId: true,
        roleId: true,
        role: {
          select: {
            code: true,
            name: true,
          },
        },
        project: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        assignedAt: "asc",
      },
    });

    return assignments.map((assignment) => ({
      projectId: assignment.projectId,
      projectName: assignment.project.name,
      roleId: assignment.roleId,
      roleCode: assignment.role.code,
      roleName: assignment.role.name,
    }));
  }

  private async getUserPermissionCodes(userId: string) {
    const assignments = await this.prisma.projectUser.findMany({
      where: {
        userId,
        status: RecordStatus.ACTIVE,
        role: {
          status: RecordStatus.ACTIVE,
        },
      },
      select: {
        role: {
          select: {
            rolePermissions: {
              where: {
                permission: {
                  status: RecordStatus.ACTIVE,
                },
              },
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return new Set(
      assignments.flatMap((assignment) =>
        assignment.role.rolePermissions.map(
          (rolePermission) => rolePermission.permission.code,
        ),
      ),
    );
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

function buildUserReadWhere(
  filters: UserFilters,
  accessibleProjectIds: string[] | null,
): Prisma.UserWhereInput {
  const search = filters.search?.trim();

  return {
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
    OR: search
      ? [
          {
            fullName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        ]
      : undefined,
    projectAssignments: accessibleProjectIds
      ? {
          some: {
            projectId: {
              in: accessibleProjectIds,
            },
            status: RecordStatus.ACTIVE,
          },
        }
      : undefined,
  };
}

function buildVisibleAssignmentWhere(
  accessibleProjectIds: string[] | null,
): Prisma.ProjectUserWhereInput {
  return {
    status: RecordStatus.ACTIVE,
    projectId: accessibleProjectIds
      ? {
          in: accessibleProjectIds,
        }
      : undefined,
  };
}

function parsePagination(page?: string, limit?: string) {
  const parsedPage = Number(page);
  const parsedLimit = Number(limit);
  const safePage =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const safeLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 20;

  return {
    page: safePage,
    limit: safeLimit,
  };
}

function normalizeRoleAssignments(
  assignments: NormalizedRoleAssignment[] | undefined,
) {
  if (!assignments) {
    throw new BadRequestException("Debe enviar assignments.");
  }

  const seenAssignments = new Set<string>();
  const normalizedAssignments: NormalizedRoleAssignment[] = [];

  for (const assignment of assignments) {
    const normalizedAssignment = {
      projectId: assignment.projectId,
      roleId: assignment.roleId,
    };
    const key = assignmentKey(normalizedAssignment);

    if (seenAssignments.has(key)) {
      continue;
    }

    seenAssignments.add(key);
    normalizedAssignments.push(normalizedAssignment);
  }

  return normalizedAssignments;
}

function assignmentKey(assignment: { projectId: string; roleId: string }) {
  return `${assignment.projectId}:${assignment.roleId}`;
}

function roleHasAdminPermission(role: {
  rolePermissions: Array<{
    permission: {
      code: string;
    };
  }>;
}) {
  return role.rolePermissions.some((rolePermission) =>
    ADMIN_PERMISSION_CODES.includes(rolePermission.permission.code),
  );
}

function isNonActiveUserStatus(status: UserStatus) {
  return status !== UserStatus.ACTIVE;
}

function toUserReadDto(user: UserReadRecord): UserReadDto {
  const projectById = new Map<string, UserReadDto["projects"][number]>();
  const organizationById = new Map<
    string,
    NonNullable<UserReadDto["organization"]>
  >();
  const roleByKey = new Map<string, UserReadDto["roles"][number]>();

  for (const assignment of user.projectAssignments) {
    const project = assignment.project;
    const organization = project.organization;

    projectById.set(project.id, {
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      organization: {
        id: organization.id,
        name: organization.name,
      },
    });
    organizationById.set(organization.id, {
      id: organization.id,
      name: organization.name,
    });
    roleByKey.set(`${assignment.role.id}:${project.id}`, {
      id: assignment.role.id,
      code: assignment.role.code,
      name: assignment.role.name,
      projectId: project.id,
      projectName: project.name,
    });
  }

  const organizations = [...organizationById.values()];

  return {
    id: user.id,
    name: user.fullName,
    fullName: user.fullName,
    email: user.email,
    status: user.status,
    isActive: user.status === UserStatus.ACTIVE,
    roles: [...roleByKey.values()],
    organization: organizations[0] ?? null,
    organizations,
    projects: [...projectById.values()],
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

async function safeUnlink(filePath: string) {
  try {
    await unlink(filePath);
  } catch {
    return;
  }
}
