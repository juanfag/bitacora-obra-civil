import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RecordStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUserPayload } from "../decorators/current-user.decorator";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: CurrentUserPayload;
    }>();

    if (!request.user?.sub) {
      throw new UnauthorizedException("Authenticated user was not found.");
    }

    const userPermissions = await this.getUserPermissions(request.user.sub);
    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.has(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException("Insufficient permissions.");
    }

    return true;
  }

  private async getUserPermissions(userId: string) {
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
