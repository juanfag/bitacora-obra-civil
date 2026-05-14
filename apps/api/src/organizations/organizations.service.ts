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
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";

type OrganizationFilters = {
  status?: RecordStatus;
  nit?: string;
  name?: string;
};

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(filters: OrganizationFilters) {
    this.validateStatus(filters.status);

    return this.prisma.organization.findMany({
      where: {
        status: filters.status,
        nit: filters.nit
          ? {
              contains: filters.nit,
              mode: "insensitive",
            }
          : undefined,
        name: filters.name
          ? {
              contains: filters.name,
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
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException("Organizacion no encontrada");
    }

    return organization;
  }

  async create(
    createOrganizationDto: CreateOrganizationDto,
    audit: AuditRequestContext,
  ) {
    try {
      const organization = await this.prisma.organization.create({
        data: {
          name: createOrganizationDto.name,
          nit: createOrganizationDto.nit,
          email: createOrganizationDto.email,
          phone: createOrganizationDto.phone,
          status: createOrganizationDto.status,
          createdById: audit.actorId,
        },
      });

      await this.auditService.record({
        ...audit,
        action: "CREATE",
        entity: "Organization",
        entityId: organization.id,
      });

      return organization;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
    audit: AuditRequestContext,
  ) {
    await this.ensureExists(id);

    try {
      const organization = await this.prisma.organization.update({
        where: { id },
        data: {
          name: updateOrganizationDto.name,
          nit: updateOrganizationDto.nit,
          email: updateOrganizationDto.email,
          phone: updateOrganizationDto.phone,
          status: updateOrganizationDto.status,
          updatedById: audit.actorId,
        },
      });

      await this.auditService.record({
        ...audit,
        action: "UPDATE",
        entity: "Organization",
        entityId: organization.id,
      });

      return organization;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string, audit: AuditRequestContext) {
    await this.ensureExists(id);

    const organization = await this.prisma.organization.update({
      where: { id },
      data: {
        status: RecordStatus.INACTIVE,
        deletedById: audit.actorId,
      },
    });

    await this.auditService.record({
      ...audit,
      action: "DELETE",
      entity: "Organization",
      entityId: organization.id,
    });

    return organization;
  }

  private async ensureExists(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException("Organizacion no encontrada");
    }
  }

  private validateStatus(status?: RecordStatus) {
    if (status && !Object.values(RecordStatus).includes(status)) {
      throw new BadRequestException("Estado de organizacion invalido");
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ConflictException(
          "Ya existe una organizacion con este NIT.",
        );
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Organizacion no encontrada");
      }
    }

    throw error;
  }
}
