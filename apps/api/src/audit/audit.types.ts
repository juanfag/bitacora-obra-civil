export type AuditActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "CLOSE"
  | "VOID"
  | "CREATE_DOCUMENT"
  | "UPDATE_DOCUMENT"
  | "DELETE_DOCUMENT"
  | "DOWNLOAD_DOCUMENT"
  | "UPLOAD_DOCUMENT"
  | "USER_SIGNATURE_UPLOADED"
  | "USER_SIGNATURE_REPLACED"
  | "USER_SIGNATURE_DELETED"
  | "USER_PASSWORD_CHANGED"
  | "USER_PASSWORD_RESET"
  | "DAILY_LOG_SIGNATURE_APPLIED"
  | "RBAC_ROLE_ASSIGNED"
  | "RBAC_ROLE_REMOVED"
  | "RBAC_PERMISSION_GRANTED"
  | "RBAC_PERMISSION_REVOKED"
  | "RBAC_SCOPE_CHANGED"
  | "RBAC_PROJECT_ACCESS_GRANTED"
  | "RBAC_PROJECT_ACCESS_REMOVED"
  | "RBAC_USER_STATUS_CHANGED"
  | "RBAC_ROLE_MAPPING_UPDATED";

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
  targetUserSnapshot?: Record<string, unknown>;
  roleSnapshot?: Record<string, unknown>;
  permissionSnapshot?: Record<string, unknown>;
  scopeSnapshot?: Record<string, unknown>;
  projectSnapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};
