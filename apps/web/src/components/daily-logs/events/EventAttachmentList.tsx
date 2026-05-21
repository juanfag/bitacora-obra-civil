import { Attachment } from "@/types/attachment";

type EventAttachmentListProps = {
  attachments?: Attachment[] | null;
};

export function EventAttachmentList({ attachments }: EventAttachmentListProps) {
  if (!attachments?.length) {
    return <p className="muted attachment-empty">Sin adjuntos</p>;
  }

  return (
    <div className="attachment-list">
      <h3>Adjuntos</h3>
      <ul>
        {attachments.map((attachment) => {
          const fileName = getAttachmentName(attachment);
          const href = getAttachmentHref(attachment);

          return (
            <li className="attachment-item" key={attachment.id}>
              <div>
                {href ? (
                  <a href={href} rel="noreferrer" target="_blank">
                    {fileName}
                  </a>
                ) : (
                  <span>{fileName}</span>
                )}
                <p className="muted">
                  {[attachment.mimeType, formatFileSize(getAttachmentSize(attachment))]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
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
    attachment.originalName ??
    attachment.fileName ??
    attachment.filename ??
    attachment.name ??
    "Archivo adjunto"
  );
}

function getAttachmentSize(attachment: Attachment) {
  return attachment.sizeBytes ?? attachment.fileSize ?? attachment.size ?? null;
}

function getAttachmentHref(attachment: Attachment) {
  if (attachment.url) {
    return attachment.url;
  }

  if (attachment.path?.startsWith("http") || attachment.path?.startsWith("/")) {
    return attachment.path;
  }

  return null;
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
