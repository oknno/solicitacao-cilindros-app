import type { MaterialRequestStatus } from "../materialRequest/status";
import type { MaterialRequestCommandPermissionInput, MaterialRequestCommandPermissions } from "./permissionTypes";

const EDITABLE_STATUSES: MaterialRequestStatus[] = ["DRAFT", "RETURNED_FOR_ADJUSTMENT"];
const DRAFT_STATUS: MaterialRequestStatus[] = ["DRAFT"];
const MANAGER_PENDING_STATUS: MaterialRequestStatus[] = ["PENDING_LAMINATION_MANAGER_APPROVAL"];
const CTO_PENDING_STATUS: MaterialRequestStatus[] = ["PENDING_CTO_APPROVAL"];
const includes = (list: MaterialRequestStatus[], status?: MaterialRequestStatus) => Boolean(status && list.includes(status));

export function getMaterialRequestCommandPermissions(input: MaterialRequestCommandPermissionInput): MaterialRequestCommandPermissions {
  const { accessProfile, selectedStatus, hasSelection } = input;
  const permissions = accessProfile.permissions;
  const canApprove = hasSelection && (
    (permissions.canApproveAsManager && includes(MANAGER_PENDING_STATUS, selectedStatus))
    || (permissions.canApproveAsCTO && includes(CTO_PENDING_STATUS, selectedStatus))
  );

  return {
    canShowUpdate: true,
    canShowNew: permissions.canCreateRequest,
    canShowView: true,
    canShowEdit: permissions.canEditRequest,
    canShowDelete: permissions.canCancelRequest,
    canShowSubmit: permissions.canSubmitRequest,
    canShowReturnStatus: accessProfile.roles.includes("ADMIN"),
    canShowApprove: permissions.canApproveAsManager || permissions.canApproveAsCTO,
    canShowReject: permissions.canRejectRequest && (permissions.canApproveAsManager || permissions.canApproveAsCTO),
    canShowFilter: true,
    canShowExport: permissions.canExport,
    canUpdate: true,
    canNew: permissions.canCreateRequest,
    canView: hasSelection,
    canEdit: permissions.canEditRequest && hasSelection && includes(EDITABLE_STATUSES, selectedStatus),
    canDelete: permissions.canCancelRequest && hasSelection && includes(DRAFT_STATUS, selectedStatus),
    canSubmit: permissions.canSubmitRequest && hasSelection && includes(EDITABLE_STATUSES, selectedStatus),
    canReturnStatus: accessProfile.roles.includes("ADMIN") && hasSelection && selectedStatus !== "DRAFT" && selectedStatus !== "CANCELLED",
    canApprove,
    canReject: permissions.canRejectRequest && canApprove,
    canFilter: true,
    canExport: permissions.canExport,
  };
}
