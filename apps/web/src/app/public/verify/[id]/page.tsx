"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ApiClientError, apiRequest } from "@/lib/api-client";

type PublicVerificationResponse = {
  dailyLogShortId: string;
  projectName: string;
  logDate: string;
  status: string;
  providedCode: string;
  verified: boolean;
  reason: string;
  isClosed: boolean;
  message: string;
  generatedAt: string;
  warning?: string;
};

export default function PublicDailyLogVerificationPage() {
  return (
    <Suspense fallback={<VerificationLoading />}>
      <PublicDailyLogVerificationContent />
    </Suspense>
  );
}

function PublicDailyLogVerificationContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const dailyLogId = params.id;
  const code = searchParams.get("code");
  const [verification, setVerification] =
    useState<PublicVerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!dailyLogId || !code) {
      setError("Código de verificación requerido");
      setVerification(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const verificationCode = code;

    async function verifyDocument() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiRequest<PublicVerificationResponse>(
          `/public/daily-logs/${encodeURIComponent(
            dailyLogId,
          )}/verification?code=${encodeURIComponent(verificationCode)}`,
          {},
          { skipAuth: true },
        );

        if (isMounted) {
          setVerification(response);
        }
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        setVerification(null);

        if (caughtError instanceof ApiClientError) {
          if (caughtError.status === 400) {
            setError("Código de verificación requerido");
            return;
          }

          if (caughtError.status === 404) {
            setError("Bitácora no encontrada");
            return;
          }
        }

        setError("Error verificando documento");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    verifyDocument();

    return () => {
      isMounted = false;
    };
  }, [code, dailyLogId]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Verificación documental
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Verificar bitácora diaria
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Consulta pública del código impreso en el PDF de la bitácora.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {isLoading ? <VerificationLoading /> : null}

        {!isLoading && error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <h2 className="text-xl font-semibold text-red-800">
              Documento no válido
            </h2>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        ) : null}

        {!isLoading && verification ? (
          <VerificationResult verification={verification} />
        ) : null}
      </section>
    </main>
  );
}

function VerificationResult({
  verification,
}: {
  verification: PublicVerificationResponse;
}) {
  if (verification.verified) {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-emerald-700">
          ✅ Documento válido
        </h2>
        <div className="mt-5 space-y-3 text-sm text-slate-700">
          <VerificationField label="Proyecto" value={verification.projectName} />
          <VerificationField
            label="Fecha bitácora"
            value={verification.logDate}
          />
          <VerificationField label="Estado" value={verification.status} />
          <VerificationField
            label="Código consultado"
            value={verification.providedCode}
          />
          <VerificationField
            label="Fecha de verificación"
            value={formatDateTime(verification.generatedAt)}
          />
        </div>
        {verification.warning ? (
          <WarningBox message={verification.warning} />
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-red-700">
        ❌ Documento no válido
      </h2>
      <div className="mt-5 space-y-3 text-sm text-slate-700">
        <VerificationField label="reason" value={verification.reason} />
        <VerificationField label="message" value={verification.message} />
      </div>
      {verification.warning ? <WarningBox message={verification.warning} /> : null}
    </div>
  );
}

function VerificationField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-slate-900">{value}</p>
    </div>
  );
}

function WarningBox({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-amber-800">{message}</p>
    </div>
  );
}

function VerificationLoading() {
  return <p className="text-sm text-slate-600">Verificando documento...</p>;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-CO", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
