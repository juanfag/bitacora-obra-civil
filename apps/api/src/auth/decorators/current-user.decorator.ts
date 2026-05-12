import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type CurrentUserPayload = {
  sub: string;
  email: string;
  fullName: string;
  status: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{
      user?: CurrentUserPayload;
    }>();

    return request.user;
  },
);
