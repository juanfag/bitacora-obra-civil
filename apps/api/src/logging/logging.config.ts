import { randomUUID } from "node:crypto";
import { registerAs } from "@nestjs/config";
import type { Params } from "nestjs-pino";

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const parseLevel = (value: string | undefined, fallback: string) =>
  value?.trim() || fallback;

export const loggingConfig = registerAs("logging", () => {
  const nodeEnv = process.env.NODE_ENV?.trim() || "development";
  const isProduction = nodeEnv === "production";

  return {
    nodeEnv,
    level: parseLevel(process.env.LOG_LEVEL, isProduction ? "info" : "debug"),
    pretty: parseBoolean(process.env.LOG_PRETTY, false),
  };
});

export const createPinoHttpOptions = (
  config: ReturnType<typeof loggingConfig>,
): Params["pinoHttp"] => {
  const pretty = config.pretty
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: true,
            translateTime: "SYS:standard",
          },
        },
      }
    : {};

  return {
    level: config.level,
    genReqId: (request, response) => {
      const incomingRequestId = request.headers["x-request-id"];
      const incomingCorrelationId = request.headers["x-correlation-id"];
      const requestId =
        (Array.isArray(incomingRequestId)
          ? incomingRequestId[0]
          : incomingRequestId) ||
        (Array.isArray(incomingCorrelationId)
          ? incomingCorrelationId[0]
          : incomingCorrelationId) ||
        randomUUID();

      response.setHeader("x-request-id", requestId);
      response.setHeader("x-correlation-id", requestId);

      return requestId;
    },
    customProps: (request) => ({
      correlationId: request.id,
      requestId: request.id,
    }),
    customSuccessMessage: (_request, response) =>
      `request completed with status ${response.statusCode}`,
    customErrorMessage: (_request, response, error) =>
      `request failed with status ${response.statusCode}: ${error.message}`,
    customAttributeKeys: {
      req: "request",
      res: "response",
      err: "error",
      responseTime: "responseTimeMs",
    },
    serializers: {
      req(request) {
        return {
          id: request.id,
          method: request.method,
          url: request.url,
          remoteAddress: request.remoteAddress,
          remotePort: request.remotePort,
        };
      },
      res(response) {
        return {
          statusCode: response.statusCode,
        };
      },
      err(error) {
        return {
          type: error.type,
          message: error.message,
          stack: error.stack,
        };
      },
    },
    ...pretty,
  };
};
