"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiClientError,
  getMyPermissions,
  type MyPermissionsResponse,
} from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import {
  hasAnyPermission,
  hasPermission,
  type PermissionState,
} from "@/lib/rbac-permissions";

type CurrentPermissionsState = {
  error: string | null;
  isLoading: boolean;
  permissionCodes: string[] | null;
};

export function useCurrentPermissions() {
  const [state, setState] = useState<CurrentPermissionsState>({
    error: null,
    isLoading: true,
    permissionCodes: null,
  });

  useEffect(() => {
    let isMounted = true;

    if (!getAccessToken()) {
      setState({
        error: null,
        isLoading: false,
        permissionCodes: null,
      });
      return;
    }

    async function loadPermissions() {
      try {
        const response: MyPermissionsResponse = await getMyPermissions();

        if (!isMounted) {
          return;
        }

        setState({
          error: null,
          isLoading: false,
          permissionCodes: response.permissionCodes,
        });
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        setState({
          error:
            caughtError instanceof ApiClientError
              ? caughtError.message
              : "No fue posible cargar permisos.",
          isLoading: false,
          permissionCodes: null,
        });
      }
    }

    loadPermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  const permissionState = useMemo<PermissionState>(
    () => ({
      isFallbackOpen: state.isLoading || Boolean(state.error),
      permissionCodes: state.permissionCodes,
    }),
    [state.error, state.isLoading, state.permissionCodes],
  );

  return {
    ...state,
    can: (permission: string) => hasPermission(permissionState, permission),
    canAny: (permissions: string[]) =>
      hasAnyPermission(permissionState, permissions),
    permissionState,
  };
}
