import { INestApplication } from "@nestjs/common";
import request from "supertest";

export async function loginAsDemoAdmin(app: INestApplication) {
  const email = process.env.SMOKE_ADMIN_EMAIL ?? "admin@bitacora.local";
  const password = process.env.SMOKE_ADMIN_PASSWORD ?? "Password123!";

  const response = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ email, password })
    .expect(201);

  expect(response.body.accessToken).toEqual(expect.any(String));

  return {
    token: response.body.accessToken as string,
    user: response.body.user as { id: string; email: string },
  };
}

export const authHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});
