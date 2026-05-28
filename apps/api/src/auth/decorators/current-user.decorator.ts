import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";

export type CurrentUserPayload = {
  sub: string;
  email: string;
  fullName: string;
  status: string;
  tokenVersion: number;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{
      user?: CurrentUserPayload;
    }>();

    if (!request.user) {
      throw new UnauthorizedException("Authenticated user was not found.");
    }

    return request.user;
  },
);
