export type Attachment = {
  id: string;
  dailyLogEventId?: string | null;
  fileName?: string | null;
  filename?: string | null;
  name?: string | null;
  originalName?: string | null;
  originalFilename?: string | null;
  sanitizedFilename?: string | null;
  mimeType?: string | null;
  extension?: string | null;
  sizeBytes?: number | null;
  fileSize?: number | null;
  size?: number | null;
  checksumSha256?: string | null;
  storageProvider?: string | null;
  uploadedAt?: string | null;
  uploadedById?: string | null;
  uploadedBy?: {
    id?: string | null;
    fullName?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
  isInlinePreviewAllowed?: boolean | null;
  url?: string | null;
  path?: string | null;
  createdAt?: string | null;
};
