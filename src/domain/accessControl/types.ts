export type AccessRole = "ADMIN" | "CTO" | "MANAGER" | "USER";

export type DataScope = "ALL_CENTERS" | "ASSIGNED_CENTERS" | "OWN_REQUESTS";

export interface AccessPermissions {
  canViewAllCenters: boolean;
  canViewAssignedCenters: boolean;
  canCreateRequest: boolean;
  canEditRequest: boolean;
  canCancelRequest: boolean;
  canSubmitRequest: boolean;
  canApproveAsManager: boolean;
  canApproveAsCTO: boolean;
  canReturnRequest: boolean;
  canRejectRequest: boolean;
  canUploadStock: boolean;
  canExport: boolean;
  canManageAccess: boolean;
}

export interface UserAccessProfile {
  userEmail: string;
  roles: AccessRole[];
  centers: string[];
  dataScope: DataScope;
  permissions: AccessPermissions;
}

export interface MaterialAccessControlRecord {
  id?: number;
  title: string;
  userEmail: string;
  role: AccessRole;
  center: string;
}
