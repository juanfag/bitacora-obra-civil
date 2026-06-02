export type SeedPermission = {
  code: string;
  name: string;
  description: string;
};

export type LegacyPermissionMapping = {
  legacy: string;
  v2: string[];
  notes?: string;
};

export const rbacV2Permissions: SeedPermission[] = [
  {
    code: "projects:read",
    name: "Read projects",
    description: "RBAC v2 catalog permission for reading projects.",
  },
  {
    code: "projects:create",
    name: "Create projects",
    description: "RBAC v2 catalog permission for creating projects.",
  },
  {
    code: "projects:update",
    name: "Update projects",
    description: "RBAC v2 catalog permission for updating projects.",
  },
  {
    code: "projects:assign_users",
    name: "Assign project users",
    description: "RBAC v2 catalog permission for assigning users to projects.",
  },
  {
    code: "daily_logs:read",
    name: "Read daily logs",
    description: "RBAC v2 catalog permission for reading daily logs.",
  },
  {
    code: "daily_logs:create",
    name: "Create daily logs",
    description: "RBAC v2 catalog permission for creating daily logs.",
  },
  {
    code: "daily_logs:update",
    name: "Update daily logs",
    description: "RBAC v2 catalog permission for updating editable daily logs.",
  },
  {
    code: "daily_logs:submit",
    name: "Submit daily logs",
    description: "RBAC v2 catalog permission for submitting daily logs to review.",
  },
  {
    code: "daily_logs:approve",
    name: "Approve daily logs",
    description: "RBAC v2 catalog permission for approving daily logs.",
  },
  {
    code: "daily_logs:reject",
    name: "Reject daily logs",
    description: "RBAC v2 catalog permission for rejecting daily logs.",
  },
  {
    code: "daily_logs:close",
    name: "Close daily logs",
    description: "RBAC v2 catalog permission for closing daily logs.",
  },
  {
    code: "daily_logs:void",
    name: "Void daily logs",
    description: "RBAC v2 catalog permission for voiding daily logs.",
  },
  {
    code: "daily_logs:download_pdf",
    name: "Download daily log PDF",
    description: "RBAC v2 catalog permission for downloading daily log PDFs.",
  },
  {
    code: "daily_log_events:create",
    name: "Create daily log events",
    description: "RBAC v2 catalog permission for creating daily log events.",
  },
  {
    code: "daily_log_events:update",
    name: "Update daily log events",
    description: "RBAC v2 catalog permission for updating daily log events.",
  },
  {
    code: "attachments:upload",
    name: "Upload attachments",
    description: "RBAC v2 catalog permission for uploading attachments.",
  },
  {
    code: "attachments:download",
    name: "Download attachments",
    description: "RBAC v2 catalog permission for downloading attachments.",
  },
  {
    code: "signatures:apply",
    name: "Apply signatures",
    description: "RBAC v2 catalog permission for applying signatures.",
  },
  {
    code: "audit_logs:read",
    name: "Read audit logs",
    description: "RBAC v2 catalog permission for reading audit logs.",
  },
  {
    code: "users:read",
    name: "Read users",
    description: "RBAC v2 catalog permission for reading users.",
  },
  {
    code: "users:create",
    name: "Create users",
    description: "RBAC v2 catalog permission for creating users.",
  },
  {
    code: "users:update",
    name: "Update users",
    description: "RBAC v2 catalog permission for updating users.",
  },
  {
    code: "users:manage_status",
    name: "Manage user status",
    description: "RBAC v2 catalog permission for activating or deactivating users.",
  },
  {
    code: "roles:assign",
    name: "Assign roles",
    description: "RBAC v2 catalog permission for assigning roles.",
  },
  {
    code: "dashboard:read",
    name: "Read dashboard",
    description: "RBAC v2 catalog permission for reading dashboard metrics.",
  },
  {
    code: "documents:read",
    name: "Read documents",
    description: "RBAC v2 catalog permission for reading documents.",
  },
  {
    code: "documents:create",
    name: "Create documents",
    description: "RBAC v2 catalog permission for creating documents.",
  },
  {
    code: "documents:update",
    name: "Update documents",
    description: "RBAC v2 catalog permission for updating documents.",
  },
  {
    code: "documents:approve",
    name: "Approve documents",
    description: "RBAC v2 catalog permission for approving documents.",
  },
  {
    code: "documents:download",
    name: "Download documents",
    description: "RBAC v2 catalog permission for downloading documents.",
  },
  {
    code: "documents:delete",
    name: "Delete documents",
    description: "RBAC v2 catalog permission for deleting documents.",
  },
];

export const legacyToRbacV2PermissionMappings: LegacyPermissionMapping[] = [
  { legacy: "organizations:read", v2: ["organizations:read"] },
  { legacy: "organizations:create", v2: ["organizations:create"] },
  { legacy: "organizations:update", v2: ["organizations:update"] },
  { legacy: "organizations:delete", v2: ["organizations:delete"] },
  { legacy: "projects:read", v2: ["projects:read"] },
  { legacy: "projects:create", v2: ["projects:create"] },
  { legacy: "projects:update", v2: ["projects:update"] },
  { legacy: "projects:delete", v2: ["projects:delete"] },
  { legacy: "daily-logs:read", v2: ["daily_logs:read", "daily_logs:download_pdf"] },
  { legacy: "dailylogs:read", v2: ["daily_logs:read"], notes: "Compatibility alias observed in client examples." },
  { legacy: "daily-logs:create", v2: ["daily_logs:create"] },
  { legacy: "daily-logs:update", v2: ["daily_logs:update", "daily_logs:submit", "daily_logs:approve", "daily_logs:reject", "daily_logs:close", "signatures:apply"] },
  { legacy: "dailylogs:approve", v2: ["daily_logs:approve"], notes: "Compatibility alias observed in client examples." },
  { legacy: "daily-logs:delete", v2: ["daily_logs:void"] },
  { legacy: "daily-log-events:create", v2: ["daily_log_events:create"] },
  { legacy: "daily-log-events:update", v2: ["daily_log_events:update"] },
  { legacy: "attachments:create", v2: ["attachments:upload"] },
  { legacy: "attachments:read", v2: ["attachments:download"] },
  { legacy: "documents:read", v2: ["documents:read", "documents:download"] },
  { legacy: "documents:create", v2: ["documents:create"] },
  { legacy: "documents:update", v2: ["documents:update"] },
  { legacy: "documents:delete", v2: ["documents:delete"] },
  { legacy: "audit:read", v2: ["audit_logs:read"] },
  { legacy: "users:read", v2: ["users:read"] },
  { legacy: "users:create", v2: ["users:create"] },
  { legacy: "users:update", v2: ["users:update", "users:manage_status"] },
  { legacy: "users:manage", v2: ["users:manage_status", "roles:assign"] },
  { legacy: "roles:assign", v2: ["roles:assign"] },
];
