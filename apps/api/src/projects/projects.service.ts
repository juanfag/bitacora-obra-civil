import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ProjectStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";

type ProjectFilters = {
  organizationId?: string;
  status?: ProjectStatus;
};

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: ProjectFilters) {
    this.validateStatus(filters.status);

    return this.prisma.project.findMany({
      where: {
        organizationId: filters.organizationId,
        status: filters.status,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return project;
  }

  async create(createProjectDto: CreateProjectDto) {
    try {
      return await this.prisma.project.create({
        data: {
          organizationId: createProjectDto.organizationId,
          code: createProjectDto.code,
          name: createProjectDto.name,
          description: createProjectDto.description,
          location: createProjectDto.location,
          startDate: this.toDate(createProjectDto.startDate),
          endDate: this.toDate(createProjectDto.endDate),
          status: createProjectDto.status,
          createdById: createProjectDto.createdBy,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    await this.ensureExists(id);

    try {
      return await this.prisma.project.update({
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
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);

    return this.prisma.project.update({
      where: { id },
      data: {
        status: ProjectStatus.CANCELLED,
      },
    });
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
