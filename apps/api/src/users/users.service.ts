import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RecordStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

  private async ensureExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
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
