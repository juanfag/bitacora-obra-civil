export type AuditActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "CLOSE"
  | "VOID"
  | "USER_SIGNATURE_UPLOADED"
  | "USER_SIGNATURE_REPLACED"
  | "USER_SIGNATURE_DELETED"
  | "DAILY_LOG_SIGNATURE_APPLIED";

export type AuditRequestContext = {
  actorId: string;
  ip?: string;
  userAgent?: string;
};

export type AuditLogInput = AuditRequestContext & {
  action: AuditActionType;
  entity: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
};
