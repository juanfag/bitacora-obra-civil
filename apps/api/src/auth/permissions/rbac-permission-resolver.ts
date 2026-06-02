import { Injectable } from "@nestjs/common";

type PermissionMapping = {
  legacy: string;
  v2: string[];
};

export type FutureScopeType = "GLOBAL" | "ORGANIZATION" | "PROJECT" | "OWN";

export type FuturePermissionScope = {
  scopeType: FutureScopeType;
  organizationId?: string;
  projectId?: string;
  ownerUserId?: string;
};

const LEGACY_TO_RBAC_V2_PERMISSION_MAPPINGS: PermissionMapping[] = [
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
  { legacy: "event-types:read", v2: ["event_types:read"] },
  { legacy: "event-types:create", v2: ["event_types:create"] },
  { legacy: "event-types:update", v2: ["event_types:update"] },
  { legacy: "event-types:delete", v2: ["event_types:delete"] },
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

@Injectable()
export class RbacPermissionResolver {
  private readonly equivalentPermissionsByCode = buildPermissionEquivalenceMap();

  expandPermission(permission: string) {
    return this.equivalentPermissionsByCode.get(permission) ?? new Set([permission]);
  }

  expandPermissions(permissions: Iterable<string>) {
    const expandedPermissions = new Set<string>();

    for (const permission of permissions) {
      for (const equivalentPermission of this.expandPermission(permission)) {
        expandedPermissions.add(equivalentPermission);
      }
    }

    return expandedPermissions;
  }

  hasAnyPermission(userPermissions: Iterable<string>, requiredPermissions: string[]) {
    const expandedUserPermissions = this.expandPermissions(userPermissions);

    return requiredPermissions.some((permission) =>
      [...this.expandPermission(permission)].some((equivalentPermission) =>
        expandedUserPermissions.has(equivalentPermission),
      ),
    );
  }
}

function buildPermissionEquivalenceMap() {
  const permissionGroups = LEGACY_TO_RBAC_V2_PERMISSION_MAPPINGS.map(
    (mapping) => [mapping.legacy, ...mapping.v2],
  );
  const equivalenceMap = new Map<string, Set<string>>();

  for (const group of permissionGroups) {
    const expandedGroup = new Set(group);

    for (const permission of group) {
      const existingGroup = equivalenceMap.get(permission);

      if (!existingGroup) {
        continue;
      }

      for (const existingPermission of existingGroup) {
        expandedGroup.add(existingPermission);
      }
    }

    for (const permission of expandedGroup) {
      equivalenceMap.set(permission, expandedGroup);
    }
  }

  return equivalenceMap;
}
