export type PermissionState = {
  isFallbackOpen: boolean;
  permissionCodes: string[] | null;
};

type PermissionMapping = {
  legacy: string;
  v2: string[];
};

const legacyToRbacV2PermissionMappings: PermissionMapping[] = [
  { legacy: "organizations:read", v2: ["organizations:read"] },
  { legacy: "organizations:create", v2: ["organizations:create"] },
  { legacy: "organizations:update", v2: ["organizations:update"] },
  { legacy: "organizations:delete", v2: ["organizations:delete"] },
  { legacy: "projects:read", v2: ["projects:read"] },
  { legacy: "projects:create", v2: ["projects:create"] },
  { legacy: "projects:update", v2: ["projects:update"] },
  { legacy: "projects:delete", v2: ["projects:delete"] },
  { legacy: "daily-logs:read", v2: ["daily_logs:read", "daily_logs:download_pdf"] },
  { legacy: "dailylogs:read", v2: ["daily_logs:read"] },
  { legacy: "daily-logs:create", v2: ["daily_logs:create"] },
  { legacy: "dailylogs:create", v2: ["daily_logs:create"] },
  {
    legacy: "daily-logs:update",
    v2: [
      "daily_logs:update",
      "daily_logs:submit",
      "daily_logs:approve",
      "daily_logs:reject",
      "daily_logs:close",
      "signatures:apply",
    ],
  },
  { legacy: "dailylogs:update", v2: ["daily_logs:update"] },
  { legacy: "dailylogs:approve", v2: ["daily_logs:approve"] },
  { legacy: "daily-logs:delete", v2: ["daily_logs:void"] },
  { legacy: "daily-log-events:read", v2: ["daily_log_events:read"] },
  { legacy: "daily-log-events:create", v2: ["daily_log_events:create"] },
  { legacy: "daily-log-events:update", v2: ["daily_log_events:update"] },
  { legacy: "daily-log-events:delete", v2: ["daily_log_events:delete"] },
  { legacy: "attachments:create", v2: ["attachments:upload"] },
  { legacy: "attachments:read", v2: ["attachments:read", "attachments:download"] },
  { legacy: "attachments:delete", v2: ["attachments:delete"] },
  { legacy: "documents:read", v2: ["documents:read", "documents:download"] },
  { legacy: "documents:create", v2: ["documents:create"] },
  { legacy: "documents:update", v2: ["documents:update"] },
  { legacy: "documents:delete", v2: ["documents:delete"] },
  { legacy: "audit:read", v2: ["audit_logs:read"] },
  { legacy: "users:read", v2: ["users:read"] },
  { legacy: "users:create", v2: ["users:create"] },
  { legacy: "users:update", v2: ["users:update", "users:manage_status"] },
  { legacy: "users:manage", v2: ["users:manage_status", "roles:assign"] },
  { legacy: "users:password:reset", v2: ["users:password_reset"] },
  { legacy: "roles:read", v2: ["roles:read"] },
  { legacy: "roles:assign", v2: ["roles:assign"] },
  { legacy: "dashboard:read", v2: ["dashboard:read"] },
];

const permissionEquivalenceMap = buildPermissionEquivalenceMap();

export function hasPermission(
  permissionState: PermissionState,
  permission: string,
) {
  if (permissionState.isFallbackOpen || !permissionState.permissionCodes) {
    return true;
  }

  const expandedUserPermissions = expandPermissions(
    permissionState.permissionCodes,
  );

  return [...expandPermission(permission)].some((equivalentPermission) =>
    expandedUserPermissions.has(equivalentPermission),
  );
}

export function hasAnyPermission(
  permissionState: PermissionState,
  permissions: string[],
) {
  return permissions.some((permission) => hasPermission(permissionState, permission));
}

export function expandPermission(permission: string) {
  return permissionEquivalenceMap.get(permission) ?? new Set([permission]);
}

export function expandPermissions(permissions: Iterable<string>) {
  const expandedPermissions = new Set<string>();

  for (const permission of permissions) {
    for (const equivalentPermission of expandPermission(permission)) {
      expandedPermissions.add(equivalentPermission);
    }
  }

  return expandedPermissions;
}

function buildPermissionEquivalenceMap() {
  const equivalenceMap = new Map<string, Set<string>>();

  for (const mapping of legacyToRbacV2PermissionMappings) {
    const group = new Set([mapping.legacy, ...mapping.v2]);

    for (const permission of group) {
      const existingGroup = equivalenceMap.get(permission);

      if (!existingGroup) {
        continue;
      }

      for (const existingPermission of existingGroup) {
        group.add(existingPermission);
      }
    }

    for (const permission of group) {
      equivalenceMap.set(permission, group);
    }
  }

  return equivalenceMap;
}
