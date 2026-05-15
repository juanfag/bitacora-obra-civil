import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { authHeader } from "./auth.helper";

export async function createDailyLog(
  app: INestApplication,
  token: string,
  input: {
    projectId: string;
    logDate: string;
    comments?: string;
  },
) {
  const response = await request(app.getHttpServer())
    .post("/api/v1/daily-logs")
    .set(authHeader(token))
    .send(input)
    .expect(201);

  expect(response.body.id).toEqual(expect.any(String));
  expect(response.body.status).toBe("DRAFT");

  return response.body as {
    id: string;
    projectId: string;
    logDate: string;
    status: string;
  };
}

export async function createDailyLogEvent(
  app: INestApplication,
  token: string,
  input: {
    dailyLogId: string;
    eventTypeId: string;
    activity?: string;
    executionDescription?: string;
  },
) {
  const response = await request(app.getHttpServer())
    .post("/api/v1/daily-log-events")
    .set(authHeader(token))
    .send({
      dailyLogId: input.dailyLogId,
      eventTypeId: input.eventTypeId,
      activity: input.activity ?? "Smoke test activity",
      executionDescription:
        input.executionDescription ?? "Smoke test execution description",
      reportedAt: new Date().toISOString(),
    })
    .expect(201);

  expect(response.body.id).toEqual(expect.any(String));
  expect(response.body.dailyLogId).toBe(input.dailyLogId);

  return response.body as {
    id: string;
    dailyLogId: string;
    eventTypeId: string;
  };
}

export async function uploadPdfAttachment(
  app: INestApplication,
  token: string,
  dailyLogEventId: string,
  expectedStatus = 201,
) {
  return request(app.getHttpServer())
    .post("/api/v1/attachments/upload")
    .set(authHeader(token))
    .field("dailyLogEventId", dailyLogEventId)
    .attach("file", Buffer.from("%PDF-1.4\n% smoke\n"), {
      filename: "smoke.pdf",
      contentType: "application/pdf",
    })
    .expect(expectedStatus);
}
