import type { ApproverRole, MaterialRequest } from "../materialRequest";
import { normalizeCenter } from "../materialRequest";
import type { AccessPermissions, AccessRole, DataScope, UserAccessProfile } from "./types";

const ROLE_ORDER: AccessRole[] = ["ADMIN", "CTO", "MANAGER", "USER"];

function emptyPermissions(): AccessPermissions {
  return {
    canViewAllCenters: false,
    canViewAssignedCenters: false,
    canCreateRequest: false,
    canEditRequest: false,
    canCancelRequest: false,
    canSubmitRequest: false,
    canApproveAsManager: false,
    canApproveAsCTO: false,
    canReturnRequest: false,
    canRejectRequest: false,
    canUploadStock: false,
    canExport: false,
    canManageAccess: false,
  };
}

const PERMISSIONS_BY_ROLE: Record<AccessRole, AccessPermissions> = {
  ADMIN: {
    ...emptyPermissions(), canViewAllCenters: true, canCreateRequest: true, canEditRequest: true,
    canCancelRequest: true, canSubmitRequest: true, canApproveAsManager: true, canApproveAsCTO: true,
    canReturnRequest: true, canRejectRequest: true, canUploadStock: true, canExport: true, canManageAccess: true,
  },
  CTO: {
    ...emptyPermissions(), canViewAllCenters: true, canApproveAsCTO: true, canReturnRequest: true,
    canRejectRequest: true, canExport: true,
  },
  MANAGER: {
    ...emptyPermissions(), canViewAssignedCenters: true, canApproveAsManager: true, canReturnRequest: true,
    canRejectRequest: true,
  },
  USER: {
    ...emptyPermissions(), canViewAssignedCenters: true, canCreateRequest: true, canEditRequest: true, canCancelRequest: true,
    canSubmitRequest: true,
  },
};

function mergePermissions(roles: AccessRole[]): AccessPermissions {
  return roles.reduce((merged, role) => {
    const rolePermissions = PERMISSIONS_BY_ROLE[role];
    return Object.fromEntries(
      Object.keys(merged).map((key) => [key, merged[key as keyof AccessPermissions] || rolePermissions[key as keyof AccessPermissions]]),
    ) as unknown as AccessPermissions;
  }, emptyPermissions());
}

export function buildUserAccessProfile(input: { userEmail: string; roles: AccessRole[]; centers?: string[] }): UserAccessProfile {
  const roles = ROLE_ORDER.filter((role) => input.roles.includes(role));
  const effectiveRoles: AccessRole[] = roles.length > 0 ? roles : ["USER"];
  const centers = Array.from(new Set((input.centers ?? []).map(normalizeCenter).filter(Boolean)));
  const dataScope: DataScope = effectiveRoles.includes("ADMIN") || effectiveRoles.includes("CTO")
    ? "ALL_CENTERS"
    : centers.length > 0
      ? "ASSIGNED_CENTERS"
      : "OWN_REQUESTS";

  return { userEmail: input.userEmail.trim().toLowerCase(), roles: effectiveRoles, centers, dataScope, permissions: mergePermissions(effectiveRoles) };
}

const MANAGER_VISIBLE_STATUSES = new Set(["PENDING_LAMINATION_MANAGER_APPROVAL", "PENDING_CTO_APPROVAL", "APPROVED", "REJECTED"]);
const CTO_VISIBLE_STATUSES = new Set(["PENDING_CTO_APPROVAL", "APPROVED", "REJECTED"]);

function isRequester(profile: UserAccessProfile, request: MaterialRequest): boolean {
  return Boolean(profile.userEmail) && request.requesterEmail?.trim().toLowerCase() === profile.userEmail;
}

function isAssignedCenter(profile: UserAccessProfile, request: MaterialRequest): boolean {
  return profile.centers.includes(normalizeCenter(request.center));
}

export function canAccessMaterialRequest(profile: UserAccessProfile, request: MaterialRequest): boolean {
  if (profile.roles.includes("ADMIN")) return true;
  if (profile.roles.includes("CTO")) return CTO_VISIBLE_STATUSES.has(request.status);

  const ownsRequest = isRequester(profile, request);

  if (profile.roles.includes("MANAGER")) {
    if (profile.centers.length === 0) return ownsRequest && MANAGER_VISIBLE_STATUSES.has(request.status);
    return MANAGER_VISIBLE_STATUSES.has(request.status) && isAssignedCenter(profile, request);
  }

  if (profile.roles.includes("USER")) {
    if (profile.centers.length === 0) return ownsRequest;
    return isAssignedCenter(profile, request);
  }

  return ownsRequest;
}

export function assertCanModifyOwnMaterialRequest(profile: UserAccessProfile, request: MaterialRequest): void {
  if (profile.roles.includes("ADMIN")) return;
  const requesterEmail = request.requesterEmail?.trim().toLowerCase();
  if (!profile.userEmail || requesterEmail !== profile.userEmail) {
    throw new Error("Somente o solicitante ou um administrador pode alterar esta solicitação.");
  }
}

export function filterMaterialRequestsByAccess(profile: UserAccessProfile, requests: MaterialRequest[]): MaterialRequest[] {
  return requests.filter((request) => canAccessMaterialRequest(profile, request));
}

export function filterCentersByAccess(profile: UserAccessProfile, centers: string[]): string[] {
  if (profile.dataScope === "ALL_CENTERS") return centers;
  if (profile.dataScope === "ASSIGNED_CENTERS") return centers.filter((center) => profile.centers.includes(normalizeCenter(center)));
  return [];
}

export function assertCanDecideMaterialRequest(profile: UserAccessProfile, request: MaterialRequest, approverRole: ApproverRole): void {
  if (approverRole === "LAMINATION_MANAGER") {
    if (!profile.permissions.canApproveAsManager) throw new Error("Você não possui permissão para decidir aprovações gerenciais.");
    if (request.status !== "PENDING_LAMINATION_MANAGER_APPROVAL") throw new Error("A solicitação não está pendente de aprovação do Gerente da Laminação.");
    if (!profile.roles.includes("ADMIN") && !profile.centers.includes(normalizeCenter(request.center))) {
      throw new Error("Você não possui permissão para decidir solicitações deste centro.");
    }
    return;
  }

  if (!profile.permissions.canApproveAsCTO) throw new Error("Você não possui permissão para decidir aprovações CTO.");
  if (request.status !== "PENDING_CTO_APPROVAL") throw new Error("A solicitação não está pendente de aprovação CTO.");
}

export function getAccessProfileLabel(profile: UserAccessProfile): string {
  if (profile.roles.includes("ADMIN")) return "ADMIN";
  if (profile.roles.includes("CTO")) return "CTO";
  if (profile.roles.includes("MANAGER")) return "GERENTE";
  return "USUÁRIO";
}
