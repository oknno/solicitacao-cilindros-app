import type { UserAccessProfile } from "../accessControl";
import type { MaterialRequestStatus } from "../materialRequest/status";

export type MaterialRequestCommandPermissionInput = {
  accessProfile: UserAccessProfile;
  selectedStatus?: MaterialRequestStatus;
  selectedRequesterEmail?: string;
  hasSelection: boolean;
};

export type MaterialRequestCommandPermissions = {
  canShowUpdate: boolean; canShowNew: boolean; canShowView: boolean; canShowEdit: boolean; canShowDelete: boolean;
  canShowSubmit: boolean; canShowReturnStatus: boolean; canShowApprove: boolean; canShowReject: boolean; canShowFilter: boolean; canShowExport: boolean;
  canUpdate: boolean; canNew: boolean; canView: boolean; canEdit: boolean; canDelete: boolean; canSubmit: boolean;
  canReturnStatus: boolean; canApprove: boolean; canReject: boolean; canFilter: boolean; canExport: boolean;
};
