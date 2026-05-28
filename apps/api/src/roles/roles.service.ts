import { Injectable } from "@nestjs/common";
import { RecordStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessPolicy } from "../projects/project-access.policy";
import { AssignableRoleDto } from "./dto/assignable-role-response.dto";

const ROLE_SCOPE = "PROJECT";

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessPolicy: ProjectAccessPolicy,
  ) {}

  async findAssignableRoles(userId: string): Promise<AssignableRoleDto[]> {
    const accessibleProjectIds =
      await this.projectAccessPolicy.getAccessibleProjectIds(userId);

    if (accessibleProjectIds && accessibleProjectIds.length === 0) {
      return [];
    }

    const actorPermissionCodes = await this.getUserPermissionCodes(userId);

    if (actorPermissionCodes.size === 0) {
      return [];
    }

    const roles = await this.prisma.role.findMany({
      where: {
        status: RecordStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        rolePermissions: {
          where: {
            permission: {
              status: RecordStatus.ACTIVE,
            },
          },
          select: {
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
              },
            },
          },
          orderBy: {
            permission: {
              code: "asc",
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return roles
      .filter((role) =>
        role.rolePermissions.every((rolePermission) =>
          actorPermissionCodes.has(rolePermission.permission.code),
        ),
      )
      .map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        scope: ROLE_SCOPE,
        permissions: role.rolePermissions.map((rolePermission) => ({
          id: rolePermission.permission.id,
          code: rolePermission.permission.code,
          name: rolePermission.permission.name,
          description: rolePermission.permission.description,
        })),
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
}
