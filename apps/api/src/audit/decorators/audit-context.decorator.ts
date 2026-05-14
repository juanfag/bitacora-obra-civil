import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { CurrentUserPayload } from "../../auth/decorators/current-user.decorator";
import { AuditRequestContext } from "../audit.types";

type RequestWithAuditData = {
  user?: CurrentUserPayload;
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
  headers: Record<string, string | string[] | undefined>;
};

const firstHeader = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const AuditContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuditRequestContext => {
    const request = context.switchToHttp().getRequest<RequestWithAuditData>();

    if (!request.user?.sub) {
      throw new UnauthorizedException("Authenticated user was not found.");
    }

    const forwardedFor = firstHeader(request.headers["x-forwarded-for"]);
    const ip = forwardedFor?.split(",")[0]?.trim() || request.ip || request.socket?.remoteAddress;

    return {
      actorId: request.user.sub,
      ip,
      userAgent: firstHeader(request.headers["user-agent"]),
    };
  },
);
