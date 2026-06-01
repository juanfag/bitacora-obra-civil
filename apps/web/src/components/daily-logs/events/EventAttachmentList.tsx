"use client";

import { useState } from "react";
import { Attachment } from "@/types/attachment";
import { ApiClientError, downloadAttachmentFile } from "@/lib/api-client";

type EventAttachmentListProps = {
  attachments?: Attachment[] | null;
};

type AttachmentAction = {
  attachmentId: string;
  action: "inline" | "attachment";
};

export function EventAttachmentList({ attachments }: EventAttachmentListProps) {
  const [activeAction, setActiveAction] = useState<AttachmentAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!attachments?.length) {
    return <p className="muted attachment-empty">Sin adjuntos</p>;
  }

  async function handleAttachmentAction(
    attachment: Attachment,
    disposition: "inline" | "attachment",
  ) {
    setError(null);
    setActiveAction({ action: disposition, attachmentId: attachment.id });

    try {
      const response = await downloadAttachmentFile(attachment.id, disposition);
      const url = URL.createObjectURL(response.blob);

      if (disposition === "inline") {
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return;
      }

      const link = document.createElement("a");
      link.href = url;
      link.download =
        response.fileName ?? getAttachmentName(attachment) ?? "archivo-adjunto";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "No fue posible abrir o descargar el adjunto.",
      );
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <div className="attachment-list daily-log-attachment-list">
      <div className="daily-log-attachment-title">
        <h4>Adjuntos</h4>
        <span>{attachments.length}</span>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <ul>
        {attachments.map((attachment) => {
          const fileName = getAttachmentName(attachment);
          const isPreviewable = canPreviewAttachment(attachment);
          const fileTypeLabel = getAttachmentTypeLabel(attachment);
          const thumbnailUrl = getSafeThumbnailUrl(attachment);

          return (
            <li className="attachment-item" key={attachment.id}>
              <div className="daily-log-attachment-main">
                <span className="daily-log-attachment-thumb" aria-hidden="true">
                  {thumbnailUrl ? (
                    <img alt="" src={thumbnailUrl} />
                  ) : (
                    getAttachmentIcon(attachment)
                  )}
                </span>
                <div>
                  <span className="attachment-name">{fileName}</span>
                  <p className="muted">
                    {[
                      fileTypeLabel,
                      formatFileSize(getAttachmentSize(attachment)),
                      formatUploadedAt(attachment.uploadedAt ?? attachment.createdAt),
                      getUploadedByName(attachment),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
              <div className="attachment-actions">
                {isPreviewable ? (
                  <button
                    className="button secondary"
                    disabled={isActionLoading(activeAction, attachment.id, "inline")}
                    onClick={() => handleAttachmentAction(attachment, "inline")}
                    type="button"
                  >
                    {isActionLoading(activeAction, attachment.id, "inline")
                      ? "Abriendo..."
                      : "Ver"}
                  </button>
                ) : null}
                <button
                  className="button secondary"
                  disabled={isActionLoading(
                    activeAction,
                    attachment.id,
                    "attachment",
                  )}
                  onClick={() => handleAttachmentAction(attachment, "attachment")}
                  type="button"
                >
                  {isActionLoading(activeAction, attachment.id, "attachment")
                    ? "Descargando..."
                    : "Descargar"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function getAttachmentName(attachment: Attachment) {
  return (
    attachment.originalFilename ??
    attachment.originalName ??
    attachment.fileName ??
    attachment.sanitizedFilename ??
    attachment.filename ??
    attachment.name ??
    "Archivo adjunto"
  );
}

function getAttachmentSize(attachment: Attachment) {
  return attachment.sizeBytes ?? attachment.fileSize ?? attachment.size ?? null;
}

function canPreviewAttachment(attachment: Attachment) {
  if (typeof attachment.isInlinePreviewAllowed === "boolean") {
    return attachment.isInlinePreviewAllowed;
  }

  return Boolean(
    attachment.mimeType &&
      (attachment.mimeType.startsWith("image/") ||
        attachment.mimeType === "application/pdf"),
  );
}

function getAttachmentIcon(attachment: Attachment) {
  if (attachment.mimeType?.startsWith("image/")) {
    return "IMG";
  }

  if (attachment.mimeType === "application/pdf") {
    return "PDF";
  }

  return "DOC";
}

function getAttachmentTypeLabel(attachment: Attachment) {
  if (attachment.mimeType?.startsWith("image/")) {
    return "Imagen";
  }

  if (attachment.mimeType === "application/pdf") {
    return "PDF";
  }

  return "Documento";
}

function getSafeThumbnailUrl(attachment: Attachment) {
  if (!attachment.mimeType?.startsWith("image/") || !attachment.url) {
    return null;
  }

  if (
    attachment.url.startsWith("http://") ||
    attachment.url.startsWith("https://") ||
    attachment.url.startsWith("data:image/")
  ) {
    return attachment.url;
  }

  return null;
}

function getUploadedByName(attachment: Attachment) {
  return (
    attachment.uploadedBy?.fullName ??
    attachment.uploadedBy?.name ??
    attachment.uploadedBy?.email ??
    null
  );
}

function formatUploadedAt(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `Subido ${date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })}`;
}

function isActionLoading(
  activeAction: AttachmentAction | null,
  attachmentId: string,
  action: "inline" | "attachment",
) {
  return (
    activeAction?.attachmentId === attachmentId && activeAction.action === action
  );
}

function formatFileSize(size: number | null) {
  if (!size) {
    return null;
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
