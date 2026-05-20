"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ApiClientError } from "@/lib/api-client";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@bitacora.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      const nextPath = new URLSearchParams(window.location.search).get("next");
      router.replace(nextPath ?? "/projects");
    } catch (caughtError) {
      const message =
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "No fue posible iniciar sesion. Revisa tus credenciales e intenta de nuevo.";

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <p className="eyebrow">Autenticacion</p>
          <h1>Iniciar sesion</h1>
          <p className="muted">
            Ingresa con tus credenciales para continuar.
          </p>
        </div>
      </div>

      <form className="panel form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Correo</label>
          <input
            autoComplete="email"
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@bitacora.local"
            type="email"
            value={email}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Contrasena</label>
          <input
            autoComplete="current-password"
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password123!"
            type="password"
            value={password}
          />
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Cargando..." : "Iniciar sesion"}
        </button>
      </form>
    </section>
  );
}
