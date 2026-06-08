import { normalizeCenter } from "../materialRequest/normalizeCenter";
import type { MaterialRequestStatus } from "../materialRequest/status";
import type { MaterialRequestCommandPermissionInput, MaterialRequestCommandPermissions } from "./permissionTypes";

const EDITABLE_STATUSES: MaterialRequestStatus[] = ["DRAFT", "RETURNED_TO_DRAFT", "REJECTED"];
const DRAFT_STATUS: MaterialRequestStatus[] = ["DRAFT"];
const MANAGER_PENDING_STATUS: MaterialRequestStatus[] = ["PENDING_LAMINATION_MANAGER_APPROVAL"];
const CTO_PENDING_STATUS: MaterialRequestStatus[] = ["PENDING_CTO_APPROVAL"];
const includes = (list: MaterialRequestStatus[], status?: MaterialRequestStatus) => Boolean(status && list.includes(status));

export function getMaterialRequestCommandPermissions(input: MaterialRequestCommandPermissionInput): MaterialRequestCommandPermissions {
  const { accessProfile, selectedStatus, hasSelection } = input;
  const permissions = accessProfile.permissions;
  const isAdmin = accessProfile.roles.includes("ADMIN");
  const isRequester = Boolean(accessProfile.userEmail)
    && input.selectedRequesterEmail?.trim().toLowerCase() === accessProfile.userEmail;
  const canChangeOwnRequest = isAdmin || isRequester;
  const selectedCenter = normalizeCenter(input.selectedCenter ?? "");
  const isAssignedCenter = Boolean(selectedCenter) && accessProfile.centers.includes(selectedCenter);
  const canApproveAsManager = hasSelection
    && permissions.canApproveAsManager
    && includes(MANAGER_PENDING_STATUS, selectedStatus)
    && (isAdmin || isAssignedCenter);
  const canApproveAsCTO = hasSelection
    && permissions.canApproveAsCTO
    && includes(CTO_PENDING_STATUS, selectedStatus);
  const canApprove = canApproveAsManager || canApproveAsCTO;

  return {
    canShowUpdate: true,
    canShowNew: permissions.canCreateRequest,
    canShowView: true,
    canShowEdit: permissions.canEditRequest,
    canShowDelete: permissions.canCancelRequest,
    canShowSubmit: permissions.canSubmitRequest,
    canShowReturnStatus: permissions.canSubmitRequest,
    canShowApprove: permissions.canApproveAsManager || permissions.canApproveAsCTO,
    canShowReject: permissions.canRejectRequest && (permissions.canApproveAsManager || permissions.canApproveAsCTO),
    canShowFilter: true,
    canShowExport: permissions.canExport,
    canUpdate: true,
    canNew: permissions.canCreateRequest,
    canView: hasSelection,
    canEdit: permissions.canEditRequest && canChangeOwnRequest && hasSelection && includes(EDITABLE_STATUSES, selectedStatus),
    canDelete: permissions.canCancelRequest && canChangeOwnRequest && hasSelection && includes(DRAFT_STATUS, selectedStatus),
    canSubmit: permissions.canSubmitRequest && canChangeOwnRequest && hasSelection && includes(EDITABLE_STATUSES, selectedStatus),
    canReturnStatus: permissions.canSubmitRequest && canChangeOwnRequest && hasSelection && selectedStatus === "PENDING_LAMINATION_MANAGER_APPROVAL",
    canApprove,
    canReject: permissions.canRejectRequest && canApprove,
    canFilter: true,
    canExport: permissions.canExport,
  };
}
