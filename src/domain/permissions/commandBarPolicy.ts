import type { MaterialRequestStatus } from "../materialRequest/status";
import type {
  MaterialRequestCommandPermissionInput,
  MaterialRequestCommandPermissions,
  MaterialRequestUserProfile,
} from "./permissionTypes";

const EDITABLE_STATUSES: MaterialRequestStatus[] = ["DRAFT", "RETURNED_FOR_ADJUSTMENT"];
const DRAFT_STATUS: MaterialRequestStatus[] = ["DRAFT"];
const MANAGER_PENDING_STATUS: MaterialRequestStatus[] = ["PENDING_LAMINATION_MANAGER_APPROVAL"];
const CTO_PENDING_STATUS: MaterialRequestStatus[] = ["PENDING_CTO_APPROVAL"];
const APPROVAL_PENDING_STATUSES: MaterialRequestStatus[] = [...MANAGER_PENDING_STATUS, ...CTO_PENDING_STATUS];

const SHOW_BY_PROFILE: Record<MaterialRequestUserProfile, Omit<MaterialRequestCommandPermissions,
  "canUpdate" | "canNew" | "canView" | "canEdit" | "canDelete" | "canSubmit" | "canReturnStatus" | "canApprove" | "canReject" | "canFilter" | "canExport">> = {
  REQUESTER: {
    canShowUpdate: true, canShowNew: true, canShowView: true, canShowEdit: true, canShowDelete: true,
    canShowSubmit: true, canShowReturnStatus: false, canShowApprove: false, canShowReject: false, canShowFilter: true, canShowExport: true,
  },
  LAMINATION_MANAGER: {
    canShowUpdate: true, canShowNew: false, canShowView: true, canShowEdit: false, canShowDelete: false,
    canShowSubmit: true, canShowReturnStatus: false, canShowApprove: true, canShowReject: true, canShowFilter: true, canShowExport: true,
  },
  CTO: {
    canShowUpdate: true, canShowNew: false, canShowView: true, canShowEdit: false, canShowDelete: false,
    canShowSubmit: false, canShowReturnStatus: false, canShowApprove: true, canShowReject: true, canShowFilter: true, canShowExport: true,
  },
  ADMIN: {
    canShowUpdate: true, canShowNew: true, canShowView: true, canShowEdit: true, canShowDelete: true,
    canShowSubmit: true, canShowReturnStatus: true, canShowApprove: true, canShowReject: true, canShowFilter: true, canShowExport: true,
  },
};

const includes = (list: MaterialRequestStatus[], status?: MaterialRequestStatus) => Boolean(status && list.includes(status));

export function getMaterialRequestCommandPermissions(input: MaterialRequestCommandPermissionInput): MaterialRequestCommandPermissions {
  const { profile, selectedStatus, hasSelection } = input;
  const show = SHOW_BY_PROFILE[profile];

  const canSubmitByProfile =
    (profile === "REQUESTER" || profile === "ADMIN")
      ? includes(EDITABLE_STATUSES, selectedStatus)
      : profile === "LAMINATION_MANAGER"
        ? includes(MANAGER_PENDING_STATUS, selectedStatus)
        : false;

  const canApproveByProfile =
    profile === "CTO"
      ? includes(CTO_PENDING_STATUS, selectedStatus)
      : profile === "LAMINATION_MANAGER"
        ? includes(MANAGER_PENDING_STATUS, selectedStatus)
        : profile === "ADMIN"
          ? includes(APPROVAL_PENDING_STATUSES, selectedStatus)
          : false;

  const canRejectByProfile =
    profile === "CTO"
      ? includes(CTO_PENDING_STATUS, selectedStatus)
      : profile === "LAMINATION_MANAGER"
        ? includes(MANAGER_PENDING_STATUS, selectedStatus)
        : profile === "ADMIN"
          ? includes(APPROVAL_PENDING_STATUSES, selectedStatus)
          : false;

  return {
    ...show,
    canUpdate: true,
    canNew: show.canShowNew,
    canView: hasSelection,
    canEdit: show.canShowEdit && hasSelection && includes(EDITABLE_STATUSES, selectedStatus),
    canDelete: show.canShowDelete && hasSelection && includes(DRAFT_STATUS, selectedStatus),
    canSubmit: show.canShowSubmit && hasSelection && canSubmitByProfile,
    canReturnStatus: show.canShowReturnStatus && hasSelection && profile === "ADMIN",
    canApprove: show.canShowApprove && hasSelection && canApproveByProfile,
    canReject: show.canShowReject && hasSelection && canRejectByProfile,
    canFilter: true,
    canExport: true,
  };
}
