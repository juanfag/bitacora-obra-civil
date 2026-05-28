import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ProjectStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AuditRequestContext } from "../audit/audit.types";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessPolicy } from "./project-access.policy";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";

type ProjectFilters = {
  organizationId?: string;
  status?: ProjectStatus;
};

type ProjectAccessContext = {
  currentUserId: string;
};

const PROJECT_CODE_PREFIX = "PRY";
const PROJECT_CODE_WIDTH = 6;
const PROJECT_CODE_RETRY_LIMIT = 5;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly projectAccessPolicy: ProjectAccessPolicy,
  ) {}

  async findAll(filters: ProjectFilters, currentUserId: string) {
    this.validateStatus(filters.status);
    const accessibleProjectIds =
      await this.projectAccessPolicy.getAccessibleProjectIds(currentUserId);

    if (accessibleProjectIds && accessibleProjectIds.length === 0) {
      return [];
    }

    return this.prisma.project.findMany({
      where: {
        id: accessibleProjectIds
          ? {
              in: accessibleProjectIds,
            }
          : undefined,
        organizationId: filters.organizationId,
        status: filters.status,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findOne(id: string, currentUserId: string) {
    const canAccessProject = await this.projectAccessPolicy.canAccessProject(
      currentUserId,
      id,
    );

    if (!canAccessProject) {
      throw new NotFoundException("Project not found");
    }

    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return project;
  }

  async create(createProjectDto: CreateProjectDto, audit: AuditRequestContext) {
    await this.ensureOrganizationExists(createProjectDto.organizationId);

    const context: ProjectAccessContext = { currentUserId: audit.actorId };

    try {
      const project = await this.createWithGeneratedCode(
        createProjectDto,
        context,
      );

      await this.auditService.record({
        ...audit,
        action: "CREATE",
        entity: "Project",
        entityId: project.id,
      });

      return project;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    audit: AuditRequestContext,
  ) {
    await this.ensureExists(id);

    if (updateProjectDto.organizationId) {
      await this.ensureOrganizationExists(updateProjectDto.organizationId);
    }

    try {
      const project = await this.prisma.project.update({
        where: { id },
        data: {
          organizationId: updateProjectDto.organizationId,
          code: updateProjectDto.code,
          name: updateProjectDto.name,
          description: updateProjectDto.description,
          location: updateProjectDto.location,
          startDate: this.toDate(updateProjectDto.startDate),
          endDate: this.toDate(updateProjectDto.endDate),
          status: updateProjectDto.status,
          updatedById: audit.actorId,
        },
      });

      await this.auditService.record({
        ...audit,
        action: "UPDATE",
        entity: "Project",
        entityId: project.id,
      });

      return project;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string, audit: AuditRequestContext) {
    await this.ensureExists(id);

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        status: ProjectStatus.CANCELLED,
        deletedById: audit.actorId,
      },
    });

    await this.auditService.record({
      ...audit,
      action: "DELETE",
      entity: "Project",
      entityId: project.id,
    });

    return project;
  }

  private async ensureExists(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }
  }

  private async ensureOrganizationExists(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });

    if (!organization) {
      throw new BadRequestException("Invalid organizationId reference");
    }
  }

  private async createWithGeneratedCode(
    createProjectDto: CreateProjectDto,
    context: ProjectAccessContext,
  ) {
    for (let attempt = 1; attempt <= PROJECT_CODE_RETRY_LIMIT; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const code = await this.generateNextProjectCode(tx);

            return tx.project.create({
              data: {
                organizationId: createProjectDto.organizationId,
                code,
                name: createProjectDto.name,
                description: createProjectDto.description,
                location: createProjectDto.location,
                startDate: this.toDate(createProjectDto.startDate),
                endDate: this.toDate(createProjectDto.endDate),
                status: createProjectDto.status,
                createdById: context.currentUserId,
              },
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error) {
        if (
          attempt < PROJECT_CODE_RETRY_LIMIT &&
          this.isRetryableCodeGenerationError(error)
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException("Could not generate a unique project code.");
  }

  private async generateNextProjectCode(tx: Prisma.TransactionClient) {
    const lastProject = await tx.project.findFirst({
      where: {
        code: {
          startsWith: `${PROJECT_CODE_PREFIX}-`,
        },
      },
      orderBy: {
        code: "desc",
      },
      select: {
        code: true,
      },
    });

    const lastSequence = this.parseProjectCodeSequence(lastProject?.code);
    const nextSequence = lastSequence + 1;

    return `${PROJECT_CODE_PREFIX}-${String(nextSequence).padStart(
      PROJECT_CODE_WIDTH,
      "0",
    )}`;
  }

  private parseProjectCodeSequence(code?: string) {
    const match = code?.match(/^PRY-(\d{6})$/);

    return match ? Number(match[1]) : 0;
  }

  private isRetryableCodeGenerationError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    );
  }

  private toDate(value?: string) {
    return value ? new Date(value) : undefined;
  }

  private validateStatus(status?: ProjectStatus) {
    if (status && !Object.values(ProjectStatus).includes(status)) {
      throw new BadRequestException("Invalid project status");
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ConflictException(
          "Project code already exists for this organization",
        );
      }

      if (error.code === "P2003") {
        throw new BadRequestException(
          "Invalid organizationId or createdBy reference",
        );
      }
    }

    throw error;
  }
}
