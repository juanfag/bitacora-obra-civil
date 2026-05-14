export type AuditActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "CLOSE";

export type AuditRequestContext = {
  actorId: string;
  ip?: string;
  userAgent?: string;
};

export type AuditLogInput = AuditRequestContext & {
  action: AuditActionType;
  entity: string;
  entityId: string;
};
