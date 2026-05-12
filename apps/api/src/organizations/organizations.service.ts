import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RecordStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";

type OrganizationFilters = {
  status?: RecordStatus;
  code?: string;
  name?: string;
};

type OrganizationRecord = Awaited<
  ReturnType<PrismaService["organization"]["findUnique"]>
>;

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: OrganizationFilters) {
    this.validateStatus(filters.status);

    const organizations = await this.prisma.organization.findMany({
      where: {
        status: filters.status,
        nit: filters.code
          ? {
              contains: filters.code,
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

    return organizations.map((organization) => this.toResponse(organization));
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException("Organizacion no encontrada");
    }

    return this.toResponse(organization);
  }

  async create(createOrganizationDto: CreateOrganizationDto) {
    try {
      const organization = await this.prisma.organization.create({
        data: {
          name: createOrganizationDto.name,
          nit: this.resolveNit(createOrganizationDto),
          email: createOrganizationDto.email,
          phone: createOrganizationDto.phone,
          status: createOrganizationDto.status,
        },
      });

      return this.toResponse(organization);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto) {
    await this.ensureExists(id);

    try {
      const organization = await this.prisma.organization.update({
        where: { id },
        data: {
          name: updateOrganizationDto.name,
          nit:
            updateOrganizationDto.taxId ?? updateOrganizationDto.code ?? undefined,
          email: updateOrganizationDto.email,
          phone: updateOrganizationDto.phone,
          status: updateOrganizationDto.status,
        },
      });

      return this.toResponse(organization);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);

    const organization = await this.prisma.organization.update({
      where: { id },
      data: {
        status: RecordStatus.INACTIVE,
      },
    });

    return this.toResponse(organization);
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

  private resolveNit(dto: CreateOrganizationDto) {
    return dto.taxId ?? dto.code;
  }

  private validateStatus(status?: RecordStatus) {
    if (status && !Object.values(RecordStatus).includes(status)) {
      throw new BadRequestException("Estado de organizacion invalido");
    }
  }

  private toResponse(organization: NonNullable<OrganizationRecord>) {
    return {
      id: organization.id,
      code: organization.nit,
      name: organization.name,
      legalName: organization.name,
      taxId: organization.nit,
      email: organization.email,
      phone: organization.phone,
      address: null,
      status: organization.status,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ConflictException(
          "Ya existe una organizacion con este codigo o NIT.",
        );
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Organizacion no encontrada");
      }
    }

    throw error;
  }
}
