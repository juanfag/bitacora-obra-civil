"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import {
  ApiClientError,
  UserSignature,
  changeMyPassword,
  deleteMySignature,
  getMySignature,
  uploadMySignature,
} from "@/lib/api-client";
import { logout } from "@/lib/auth";

export default function ProfilePage() {
  const router = useRouter();
  const [signature, setSignature] = useState<UserSignature | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSignature() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getMySignature();

        if (isMounted) {
          setSignature(response);
        }
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        if (caughtError instanceof ApiClientError && caughtError.status === 401) {
          logout();
          router.replace("/login");
          return;
        }

        setError("No fue posible cargar tu firma.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSignature();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    return () => {
      if (selectedPreview) {
        URL.revokeObjectURL(selectedPreview);
      }
    };
  }, [selectedPreview]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setError(null);
    setSuccessMessage(null);
    setSelectedFile(file);

    if (selectedPreview) {
      URL.revokeObjectURL(selectedPreview);
    }

    if (!file) {
      setSelectedPreview(null);
      return;
    }

    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      setSelectedPreview(null);
      setSelectedFile(null);
      setError("La firma debe ser una imagen PNG o JPG.");
      return;
    }

    if (file.size > 1024 * 1024) {
      setSelectedPreview(null);
      setSelectedFile(null);
      setError("La imagen de firma no debe superar 1 MB.");
      return;
    }

    setSelectedPreview(URL.createObjectURL(file));
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Selecciona una imagen PNG o JPG.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await uploadMySignature(selectedFile);
      setSignature(response);
      setSelectedFile(null);
      setSelectedPreview(null);
      setSuccessMessage("Firma guardada correctamente.");
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError && caughtError.status === 401) {
        logout();
        router.replace("/login");
        return;
      }

      setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "No fue posible guardar la firma.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setSuccessMessage(null);
    setIsDeleting(true);

    try {
      const response = await deleteMySignature();
      setSignature(response);
      setSuccessMessage("Firma eliminada correctamente.");
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError && caughtError.status === 401) {
        logout();
        router.replace("/login");
        return;
      }

      setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "No fue posible eliminar la firma.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("La confirmacion de contraseña no coincide.");
      return;
    }

    setIsChangingPassword(true);

    try {
      await changeMyPassword(passwordForm);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordSuccess(
        "Contraseña actualizada. Tus otras sesiones fueron invalidadas.",
      );
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError && caughtError.status === 401) {
        logout();
        router.replace("/login");
        return;
      }

      setPasswordError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "No fue posible cambiar la contraseña.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  const preview = selectedPreview ?? signature?.previewDataUrl ?? null;

  return (
    <AuthGuard>
      <section>
        <div className="page-header">
          <div>
            <p className="eyebrow">Perfil</p>
            <h1>Mi firma</h1>
            <p className="muted">
              Registra una firma maestra para usarla en flujos documentales futuros.
            </p>
          </div>
          <Link className="button secondary" href="/projects">
            Volver
          </Link>
        </div>

        <div className="panel">
          <h2>Mi firma</h2>
          <p className="muted">
            Esta firma aún no firma bitácoras. En la siguiente fase se aplicará como snapshot documental al firmar.
          </p>

          {isLoading ? <p className="muted">Cargando...</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {successMessage ? <p className="form-success">{successMessage}</p> : null}

          {!isLoading ? (
            <div className="grid">
              <div>
                <h3>Estado actual</h3>
                <p>
                  <strong>Estado:</strong>{" "}
                  {signature?.hasSignature ? "Firma registrada" : "Sin firma"}
                </p>
                <p>
                  <strong>Archivo:</strong>{" "}
                  {signature?.fileName || "No disponible"}
                </p>
                <p>
                  <strong>Tipo:</strong> {signature?.mimeType || "No disponible"}
                </p>
                <p>
                  <strong>Tamaño:</strong> {formatFileSize(signature?.fileSize)}
                </p>
                <p>
                  <strong>Cargada:</strong>{" "}
                  {signature?.uploadedAt
                    ? formatDateTime(signature.uploadedAt)
                    : "No disponible"}
                </p>
              </div>

              <div>
                <h3>Previsualización</h3>
                {preview ? (
                  <img
                    alt="Firma maestra del usuario"
                    src={preview}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      maxHeight: 180,
                      maxWidth: "100%",
                      objectFit: "contain",
                      padding: 12,
                    }}
                  />
                ) : (
                  <p className="muted">No hay firma registrada.</p>
                )}
              </div>
            </div>
          ) : null}

          <form className="form" onSubmit={handleUpload}>
            <label>
              Imagen de firma PNG/JPG
              <input
                accept="image/png,image/jpeg"
                disabled={isSubmitting}
                onChange={handleFileChange}
                type="file"
              />
            </label>
            <div className="toolbar">
              <button
                className="button"
                disabled={!selectedFile || isSubmitting}
                type="submit"
              >
                {signature?.hasSignature ? "Reemplazar firma" : "Cargar firma"}
              </button>
              <button
                className="button secondary"
                disabled={!signature?.hasSignature || isDeleting}
                onClick={handleDelete}
                type="button"
              >
                {isDeleting ? "Eliminando..." : "Eliminar firma"}
              </button>
            </div>
          </form>
        </div>

        <div className="panel profile-password-panel">
          <h2>Cambiar contraseña</h2>
          <p className="muted">
            Usa una contraseña de al menos 8 caracteres con mayúscula,
            minúscula, número y carácter especial.
          </p>

          {passwordError ? <p className="form-error">{passwordError}</p> : null}
          {passwordSuccess ? (
            <p className="form-success">{passwordSuccess}</p>
          ) : null}

          <form className="form" onSubmit={handlePasswordChange}>
            <label>
              Contraseña actual
              <input
                autoComplete="current-password"
                disabled={isChangingPassword}
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Nueva contraseña
              <input
                autoComplete="new-password"
                disabled={isChangingPassword}
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Confirmar nueva contraseña
              <input
                autoComplete="new-password"
                disabled={isChangingPassword}
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
              />
            </label>
            <button className="button" disabled={isChangingPassword} type="submit">
              {isChangingPassword ? "Actualizando..." : "Cambiar contraseña"}
            </button>
          </form>
        </div>
      </section>
    </AuthGuard>
  );
}

function formatFileSize(value?: number | null) {
  if (typeof value !== "number") {
    return "No disponible";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
