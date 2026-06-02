"use client";

import Link from "next/link";
import {
  DailyLogSignature,
  DailyLogSignatureType,
  UserSignature,
} from "@/lib/api-client";

type SignatureRole = {
  id: DailyLogSignatureType;
  role: string;
  title: string;
};

type DailyLogSignaturesTableProps = {
  canApplySignature?: boolean;
  dailyLogStatus: string;
  error: string | null;
  isLoading: boolean;
  onSign: (signatureType: DailyLogSignatureType) => void;
  signatures: DailyLogSignature[];
  signingType: DailyLogSignatureType | null;
  userSignature: UserSignature | null;
};

const signatureRoles: SignatureRole[] = [
  {
    id: "RESPONSIBLE",
    role: "Responsable / Residente",
    title: "Responsable / Residente",
  },
  {
    id: "APPROVER",
    role: "Director / Aprobador",
    title: "Director / Aprobador",
  },
  {
    id: "INSPECTOR",
    role: "Interventor / Inspector",
    title: "Interventor / Inspector",
  },
];

export function DailyLogSignaturesTable({
  canApplySignature = true,
  dailyLogStatus,
  error,
  isLoading,
  onSign,
  signatures,
  signingType,
  userSignature,
}: DailyLogSignaturesTableProps) {
  const canSign =
    dailyLogStatus === "APPROVED" || dailyLogStatus === "CLOSED";
  const canUseMasterSignature =
    canApplySignature && canSign && Boolean(userSignature?.hasSignature);

  return (
    <div className="daily-log-signatures-block">
      <div className="daily-log-signatures-note">
        <p>
          Las firmas se aplican usando la firma maestra registrada y quedan
          congeladas como evidencia histórica de esta bitácora.
        </p>
        {!canSign ? (
          <p>La bitácora debe estar aprobada o cerrada para aplicar firmas.</p>
        ) : null}
        {!userSignature?.hasSignature ? (
          <p>
            Debes registrar tu firma en <Link href="/profile#mi-firma">Mi perfil</Link>{" "}
            antes de firmar.
          </p>
        ) : null}
        {!canApplySignature ? (
          <p>No tienes permiso para aplicar firmas en esta bitÃ¡cora.</p>
        ) : null}
      </div>

      {isLoading ? <p className="muted">Cargando firmas...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="daily-log-signatures-table" role="table">
        <div className="daily-log-signature-row daily-log-signature-head" role="row">
          <span role="columnheader">Responsable</span>
          <span role="columnheader">Nombre</span>
          <span role="columnheader">Rol</span>
          <span role="columnheader">Fecha/hora</span>
          <span role="columnheader">Estado</span>
          <span role="columnheader">Firma</span>
        </div>

        {signatureRoles.map((signer) => {
          const signature = signatures.find(
            (item) => item.signatureType === signer.id,
          );

          return (
            <SignatureRow
              canSign={canUseMasterSignature}
              isSigning={signingType === signer.id}
              key={signer.id}
              onSign={() => onSign(signer.id)}
              signature={signature}
              signer={signer}
            />
          );
        })}
      </div>
    </div>
  );
}

function SignatureRow({
  canSign,
  isSigning,
  onSign,
  signature,
  signer,
}: {
  canSign: boolean;
  isSigning: boolean;
  onSign: () => void;
  signature: DailyLogSignature | undefined;
  signer: SignatureRole;
}) {
  const signerName = signature?.signerName ?? "Pendiente";
  const signerRole = signature?.signerRole ?? signer.role;

  return (
    <div className="daily-log-signature-row" role="row">
      <div className="daily-log-signature-person" data-label="Responsable">
        <span className="daily-log-signature-avatar" aria-hidden="true">
          {getInitials(signerName, signer.title)}
        </span>
        <div>
          <strong>{signer.title}</strong>
          {signature?.signerEmail ? <span>{signature.signerEmail}</span> : null}
        </div>
      </div>

      <div className="daily-log-signature-cell" data-label="Nombre">
        {signerName}
      </div>

      <div className="daily-log-signature-cell" data-label="Rol">
        {signerRole}
      </div>

      <div className="daily-log-signature-cell" data-label="Fecha/hora">
        {signature ? formatSignatureDate(signature.signedAt) : "No disponible"}
      </div>

      <div className="daily-log-signature-cell" data-label="Estado">
        <span
          className={
            signature
              ? "signature-status-badge signature-status-signed"
              : "signature-status-badge signature-status-pending"
          }
        >
          {signature ? "Firmado" : "Pendiente"}
        </span>
      </div>

      <div className="daily-log-signature-preview-cell" data-label="Firma">
        {signature ? (
          signature.previewDataUrl ? (
            <img
              alt={`Firma aplicada ${signer.role}`}
              className="daily-log-signature-preview"
              src={signature.previewDataUrl}
            />
          ) : (
            <span className="daily-log-signature-empty">Firma no disponible</span>
          )
        ) : (
          <button
            className="button secondary signature-action"
            disabled={!canSign || isSigning}
            onClick={onSign}
            type="button"
          >
            {isSigning ? "Firmando..." : "Firmar"}
          </button>
        )}
      </div>
    </div>
  );
}

function formatSignatureDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No disponible";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date);
}

function getInitials(name: string, fallback: string) {
  const source = name === "Pendiente" ? fallback : name;
  const words = source
    .split(/[\s/]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}
