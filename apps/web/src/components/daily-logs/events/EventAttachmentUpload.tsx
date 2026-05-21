"use client";

import { ChangeEvent, useState } from "react";
import { canUploadEventAttachment } from "@/lib/daily-log-workflow";

const maxFileSizeBytes = 5 * 1024 * 1024;
const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];

type EventAttachmentUploadProps = {
  dailyLogEventId: string;
  dailyLogStatus: string;
  disabled?: boolean;
  onUpload: (dailyLogEventId: string, file: File) => Promise<boolean>;
};

export function EventAttachmentUpload({
  dailyLogEventId,
  dailyLogStatus,
  disabled = false,
  onUpload,
}: EventAttachmentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isDisabled = disabled || !canUploadEventAttachment(dailyLogStatus);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSuccess(null);
    setError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!allowedMimeTypes.includes(file.type)) {
      setSelectedFile(null);
      setError("Tipo de archivo no permitido. Usa JPG, PNG o PDF.");
      return;
    }

    if (file.size > maxFileSizeBytes) {
      setSelectedFile(null);
      setError("El archivo supera el tamaño máximo permitido de 5 MB.");
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload() {
    if (isDisabled) {
      return;
    }

    if (!selectedFile) {
      setError("Selecciona un archivo para subir.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    const wasUploaded = await onUpload(dailyLogEventId, selectedFile);

    if (wasUploaded) {
      setSelectedFile(null);
      setSuccess("Adjunto cargado correctamente.");
    } else {
      setError("No fue posible cargar el adjunto.");
    }

    setIsUploading(false);
  }

  return (
    <div className="attachment-upload">
      <label htmlFor={`attachment-${dailyLogEventId}`}>Cargar adjunto</label>
      <div className="toolbar">
        <input
          accept={allowedMimeTypes.join(",")}
          disabled={isDisabled || isUploading}
          id={`attachment-${dailyLogEventId}`}
          onChange={handleFileChange}
          type="file"
        />
        <button
          className="button secondary"
          disabled={isDisabled || isUploading || !selectedFile}
          onClick={handleUpload}
          type="button"
        >
          {isUploading ? "Subiendo..." : "Subir"}
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}
    </div>
  );
}
