import { Injectable } from "@nestjs/common";
import { RecordStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

// TODO: Replace this permission-based platform bypass with an explicit
// platform policy when platform-level roles are formalized.
const PLATFORM_PROJECT_ACCESS_PERMISSION = "organizations:create";

export type ProjectAccessScopeType =
  | "GLOBAL"
  | "ORGANIZATION"
  | "PROJECT"
  | "OWN";

export type ProjectAccessResolution = {
  scopeType: ProjectAccessScopeType;
  projectIds: string[] | null;
  reason: "LEGACY_PLATFORM_BYPASS" | "PROJECT_MEMBERSHIP";
};

@Injectable()
export class ProjectAccessPolicy {
  constructor(private readonly prisma: PrismaService) {}

  async resolveAccessibleProjects(userId: string): Promise<ProjectAccessResolution> {
    if (await this.hasPlatformProjectAccess(userId)) {
      return {
        scopeType: "GLOBAL",
        projectIds: null,
        reason: "LEGACY_PLATFORM_BYPASS",
      };
    }

    return {
      scopeType: "PROJECT",
      projectIds: await this.getAssignedProjectIds(userId),
      reason: "PROJECT_MEMBERSHIP",
    };
  }

  async getAccessibleProjectIds(userId: string) {
    return (await this.resolveAccessibleProjects(userId)).projectIds;
  }

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

  private async getAssignedProjectIds(userId: string) {
    const projectMemberships = await this.prisma.projectUser.findMany({
      where: {
        userId,
        status: RecordStatus.ACTIVE,
        role: {
          status: RecordStatus.ACTIVE,
        },
      },
      distinct: ["projectId"],
      select: {
        projectId: true,
      },
    });

    return projectMemberships.map((membership) => membership.projectId);
  }
}
