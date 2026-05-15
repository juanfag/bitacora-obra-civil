export type AuditActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "CLOSE"
  | "VOID";

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
