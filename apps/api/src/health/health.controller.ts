import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check() {
    return {
      status: "ok",
      service: "bitacora-api",
    };
  }

  @Get("db")
  async checkDatabase() {
    const rolesCount = await this.prisma.role.count();

    return {
      status: "ok",
      database: "connected",
      rolesCount,
    };
  }
}
