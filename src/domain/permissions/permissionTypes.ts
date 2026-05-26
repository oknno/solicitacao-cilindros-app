import type { MaterialRequestStatus } from "../materialRequest/status";

export type MaterialRequestUserProfile = "REQUESTER" | "LAMINATION_MANAGER" | "CTO" | "ADMIN";

export type MaterialRequestCommandPermissionInput = {
  profile: MaterialRequestUserProfile;
  selectedStatus?: MaterialRequestStatus;
  hasSelection: boolean;
};

export type MaterialRequestCommandPermissions = {
  canShowUpdate: boolean;
  canShowNew: boolean;
  canShowView: boolean;
  canShowEdit: boolean;
  canShowDelete: boolean;
  canShowSubmit: boolean;
  canShowReturnStatus: boolean;
  canShowApprove: boolean;
  canShowReject: boolean;
  canShowFilter: boolean;
  canShowExport: boolean;

  canUpdate: boolean;
  canNew: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSubmit: boolean;
  canReturnStatus: boolean;
  canApprove: boolean;
  canReject: boolean;
  canFilter: boolean;
  canExport: boolean;
};
