import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { DailyLogStatus } from "@prisma/client";
import { CurrentUserPayload } from "../../auth/decorators/current-user.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { ProjectAccessPolicy } from "../../projects/project-access.policy";

@Injectable()
export class DailyLogProjectAccessGuard implements CanActivate {
  private readonly logger = new Logger(DailyLogProjectAccessGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessPolicy: ProjectAccessPolicy,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      params?: { id?: string };
      user?: CurrentUserPayload;
    }>();

    if (!request.user?.sub) {
      throw new UnauthorizedException("Authenticated user was not found.");
    }

    const dailyLogId = request.params?.id;

    if (!dailyLogId) {
      throw new ForbiddenException("Daily log id was not provided.");
    }

    const dailyLog = await this.prisma.dailyLog.findFirst({
      where: {
        id: dailyLogId,
        status: {
          not: DailyLogStatus.VOIDED,
        },
      },
      select: {
        projectId: true,
      },
    });

    if (!dailyLog) {
      throw new NotFoundException("Daily log not found");
    }

    const canAccessProject =
      await this.projectAccessPolicy.canAccessProject(
        request.user.sub,
        dailyLog.projectId,
      );

    if (!canAccessProject) {
      this.logger.warn(
        `DailyLog project access denied for user ${request.user.sub} on daily log ${dailyLogId}`,
      );
      throw new ForbiddenException("User does not have access to this project.");
    }

    return true;
  }
}
