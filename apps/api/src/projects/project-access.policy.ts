import { Injectable } from "@nestjs/common";
import { RecordStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

// TODO: Replace this permission-based platform bypass with an explicit
// platform policy when platform-level roles are formalized.
const PLATFORM_PROJECT_ACCESS_PERMISSION = "organizations:create";

@Injectable()
export class ProjectAccessPolicy {
  constructor(private readonly prisma: PrismaService) {}

  async canAccessProject(userId: string, projectId: string) {
    const projectMembership = await this.prisma.projectUser.findFirst({
      where: {
        projectId,
        userId,
        status: RecordStatus.ACTIVE,
        role: {
          status: RecordStatus.ACTIVE,
        },
      },
      select: {
        id: true,
      },
    });

    if (projectMembership) {
      return true;
    }

    return this.hasPlatformProjectAccess(userId);
  }

  private async hasPlatformProjectAccess(userId: string) {
    const platformAssignment = await this.prisma.projectUser.findFirst({
      where: {
        userId,
        status: RecordStatus.ACTIVE,
        role: {
          status: RecordStatus.ACTIVE,
          rolePermissions: {
            some: {
              permission: {
                code: PLATFORM_PROJECT_ACCESS_PERMISSION,
                status: RecordStatus.ACTIVE,
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(platformAssignment);
  }
}
